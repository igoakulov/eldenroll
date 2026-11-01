"""Tests for the label tables against the CSVs and the mod's own map and slot data."""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

import pytest

from eldenrando.build.location_labels import (
    NON_PLACE_LABELS,
    resolve_boss_location,
    resolve_labels,
)
from eldenrando.errors import BuildError
from eldenrando.loaders.annotations import load_annotations
from eldenrando.loaders.bosses import load_boss_creature_locations
from eldenrando.loaders.drops import load_drop_locations, load_item_drops
from eldenrando.loaders.itemslots import load_slots
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.location_aliases import (
    load_boss_location_overrides,
    load_location_aliases,
)
from eldenrando.loaders.region_areas import load_region_areas
from eldenrando.loaders.regions import load_regions
from eldenrando.loaders.schema import (
    LoaderError,
    get_optional_string,
    get_string,
    require_mapping,
    require_sequence,
)
from eldenrando.loaders.yaml_source import load_mapping
from eldenrando.model.annotations import Area

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
ALIASES_CSV = OVERRIDES / "location_aliases.csv"
BOSS_OVERRIDES_CSV = OVERRIDES / "boss_location_overrides.csv"
RAW = ROOT / "raw"
MOD_DATA = RAW / "pc_mod_data"
needs_files = pytest.mark.skipif(not MOD_DATA.is_dir(), reason="raw data not present")

DLC_TAG = "[DLC] "
SLOT_LABEL = re.compile(r" in m\d\d_\d\d_\d\d_\d\d \((.*?)\)(?:,|\])")
SHACK_LABEL = (
    "Mountaintops of the Giants - Shack of the Lofty; Consecrated Snowfield - Minor Erdtree, "
    "Albinauric Rise, Cave of the Forlorn Entrance"
)
CASTLE_SOL_LABEL = (
    "Mountaintops of the Giants - West of Castle Sol; Consecrated Snowfield - North of "
    "Minor Erdtree"
)
JORI_LABEL = "[DLC] Abyssal Woods - Forsaken Graveyard, Darklight Catacombs Exit"


def _areas() -> tuple[Area, ...]:
    return load_annotations(MOD_DATA / "annotations_stable.txt").areas


def _aliases() -> dict[str, str]:
    return load_location_aliases(ALIASES_CSV, location_ids={area.name for area in _areas()})


def _boss_overrides(aliases: dict[str, str]) -> dict[tuple[str, str], str]:
    return load_boss_location_overrides(
        BOSS_OVERRIDES_CSV,
        labels=aliases,
        location_ids={area.name for area in _areas()},
    )


def _region_of_area() -> dict[str, str]:
    regions = load_regions(OVERRIDES / "regions.csv")
    return load_region_areas(
        OVERRIDES / "region_areas.csv", region_ids={region.id for region in regions}
    )


def _drop_labels() -> set[str]:
    table = load_drop_locations(RAW / "csv" / "item_drop_locations.csv")
    column = table.column("Location")
    return {row[column] for row in table.rows}


def _item_drop_labels() -> set[str]:
    table = load_item_drops(RAW / "csv" / "item_drops.csv")
    column = table.column("Location #1")
    return {row[column] for row in table.rows}


def _boss_identity(name: str) -> str:
    """Return a CSV boss name without its tag, parentheticals and `- Broken` suffix."""
    return " ".join(re.sub(r"\[Boss\]|\(.*?\)|- Broken", "", name).split())


def _boss_pairs() -> set[tuple[str, str]]:
    table = load_boss_creature_locations(RAW / "csv" / "boss_creature_locations.csv")
    label = table.column("Location")
    name = table.column("Name")
    return {
        (_boss_identity(row[name]), row[label]) for row in table.rows if "[Boss]" in row[name]
    }


def _submap_areas() -> dict[str, set[str]]:
    """Return each label `submaps.txt` names with the areas it assigns that label."""
    document = load_mapping(MOD_DATA / "submaps.txt")
    named: dict[str, set[str]] = {}
    for index, entry in enumerate(require_sequence(document.get("MapAreas"), "MapAreas")):
        where = f"MapAreas[{index}]"
        rows = require_sequence(require_mapping(entry, where).get("Areas"), where)
        for row_index, row in enumerate(rows):
            row_where = f"{where}.Areas[{row_index}]"
            mapping = require_mapping(row, row_where)
            area = get_optional_string(mapping, "Area", row_where)
            if area is not None:
                named.setdefault(get_string(mapping, "Name", row_where), set()).add(area)
    return named


def _slot_lines_by_label() -> dict[str, list[tuple[str, str]]]:
    """Return `{label: [(slot area, lowercase placement line)]}` for randomizable slots."""
    lines: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for slot in load_slots(MOD_DATA / "itemslots_stable.txt"):
        if not slot.is_randomizable:
            continue
        for line in slot.debug_lines:
            match = SLOT_LABEL.search(line)
            if match and " lot " in line:
                lines[match.group(1)].append((slot.area, line.casefold()))
    return lines


@needs_files
def test_every_label_from_all_three_sources_resolves() -> None:
    aliases = _aliases()
    drop_labels = _drop_labels()
    item_drop_labels = _item_drop_labels()
    boss_labels = {label for _, label in _boss_pairs()}

    assert len(aliases) == 506
    assert len(drop_labels) == 481
    assert len(item_drop_labels) == 310
    assert len(boss_labels) == 185
    assert boss_labels <= drop_labels

    resolution = resolve_labels(drop_labels | item_drop_labels | boss_labels, aliases)
    assert resolution.unresolved == ()
    assert resolution.non_places == tuple(sorted(NON_PLACE_LABELS))
    assert resolution.resolved == aliases


@needs_files
def test_labels_agree_with_the_mod_submaps() -> None:
    aliases = _aliases()
    submaps = _submap_areas()
    shared = {
        label: submaps[label.removeprefix(DLC_TAG)]
        for label in aliases
        if label.removeprefix(DLC_TAG) in submaps
    }

    assert len(shared) == 113
    disagreeing = {label for label, areas in shared.items() if aliases[label] not in areas}
    assert disagreeing == set()


@needs_files
def test_dlc_tag_matches_the_area_dlc_flag() -> None:
    dlc_areas = {area.name for area in _areas() if area.is_dlc}

    mismatched = {
        label
        for label, location_id in _aliases().items()
        if label.startswith(DLC_TAG) != (location_id in dlc_areas)
    }
    assert mismatched == set()


@needs_files
def test_boss_label_coverage_matches_the_document() -> None:
    boss_labels = {label.removeprefix(DLC_TAG) for _, label in _boss_pairs()}
    area_texts = {area.text for area in _areas()}
    records = load_document(RAW / "json-no-dlc", "locations").records
    json_names = {str(record["name"]).casefold() for record in records}

    verbatim = {label for label in boss_labels if label in area_texts}
    in_json = {label for label in boss_labels if label.casefold() in json_names}
    assert len(verbatim) == 27
    assert len(in_json) == 44
    assert len(boss_labels - verbatim - in_json) == 125


@needs_files
def test_every_boss_is_in_the_region_of_its_own_drop_slot() -> None:
    aliases = _aliases()
    overrides = _boss_overrides(aliases)
    region_of_area = _region_of_area()
    lines = _slot_lines_by_label()

    checked = 0
    wrong: list[tuple[str, str]] = []
    for boss, label in sorted(_boss_pairs()):
        own_regions = {
            region_of_area[area]
            for area, line in lines[label.removeprefix(DLC_TAG)]
            if boss.casefold() in line
        }
        if not own_regions:
            continue
        checked += 1
        location_id = resolve_boss_location(boss, label, aliases, overrides)
        if region_of_area[location_id] not in own_regions:
            wrong.append((boss, label))

    assert checked == 191
    assert wrong == []


@needs_files
def test_every_boss_override_names_a_real_boss_on_that_label() -> None:
    aliases = _aliases()

    assert set(_boss_overrides(aliases)) <= _boss_pairs()


@needs_files
@pytest.mark.parametrize(
    ("boss", "label", "region"),
    [
        ("Great Wyrm Theodorix", SHACK_LABEL, "snowfield"),
        ("Putrid Avatar", CASTLE_SOL_LABEL, "snowfield"),
        ("Death Rite Bird", CASTLE_SOL_LABEL, "mountaintops"),
        ("Night's Cavalry", "Southwest Mountaintops", "snowfield"),
        ("Starscourge Radahn", "Southeast Caelid", "caelid"),
        ("Putrid Tree Spirit", "War-Dead Catacombs", "caelid"),
        ("Metyr, Mother of Fingers", "[DLC] Finger Birthing Grounds", "dlc_gravesite"),
        ("Jori, Elder Inquisitor", JORI_LABEL, "dlc_shadowkeep"),
        ("Grafted Scion", "Chapel of Anticipation", "liurnia"),
    ],
)
def test_owner_confirmed_boss_regions(boss: str, label: str, region: str) -> None:
    aliases = _aliases()
    overrides = _boss_overrides(aliases)

    location_id = resolve_boss_location(boss, label, aliases, overrides)

    assert _region_of_area()[location_id] == region


def test_missing_label_is_reported_not_dropped() -> None:
    resolution = resolve_labels(["b", "a", "a", "z"], {"a": "x", "unused": "y"})

    assert resolution.resolved == {"a": "x"}
    assert resolution.unresolved == ("b", "z")
    assert resolution.non_places == ()


def test_non_place_labels_are_listed_apart() -> None:
    resolution = resolve_labels(["Unused", "Spirit Summon", "a"], {"a": "x"})

    assert resolution.resolved == {"a": "x"}
    assert resolution.unresolved == ()
    assert resolution.non_places == ("Spirit Summon", "Unused")


def test_boss_override_wins_over_the_label() -> None:
    aliases = {"Tile": "first"}
    overrides = {("Boss", "Tile"): "second"}

    assert resolve_boss_location("Boss", "Tile", aliases, overrides) == "second"
    assert resolve_boss_location("Other", "Tile", aliases, overrides) == "first"


def test_boss_on_an_unknown_label_stops_the_build() -> None:
    with pytest.raises(BuildError, match="boss 'Boss' has no alias for label 'Tile'"):
        resolve_boss_location("Boss", "Tile", {}, {})


def test_duplicate_label_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label,location_id\nCave,a\nCave,b\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="duplicate label 'Cave'"):
        load_location_aliases(source, location_ids={"a", "b"})


def test_unknown_location_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label,location_id\nCave,moon\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="unknown location_id 'moon'"):
        load_location_aliases(source, location_ids={"a"})


def test_empty_label_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label,location_id\n,a\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="data row 1: empty label"):
        load_location_aliases(source, location_ids={"a"})


def test_empty_location_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label,location_id\nCave,\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="data row 1: empty location_id"):
        load_location_aliases(source, location_ids={"a"})


def test_table_without_rows_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label,location_id\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="no rows"):
        load_location_aliases(source, location_ids={"a"})


def test_missing_column_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "aliases.csv"
    source.write_text("label\nCave\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing column 'location_id'"):
        load_location_aliases(source, location_ids={"a"})


def _override_file(tmp_path: Path, row: str) -> Path:
    source = tmp_path / "overrides.csv"
    source.write_text(f"boss,label,location_id,reason,reviewer\n{row}\n", encoding="utf-8")
    return source


def test_override_row_loads(tmp_path: Path) -> None:
    source = _override_file(tmp_path, "Boss,Tile,a,why,owner")

    loaded = load_boss_location_overrides(source, labels={"Tile"}, location_ids={"a"})

    assert loaded == {("Boss", "Tile"): "a"}


@pytest.mark.parametrize(
    ("row", "message"),
    [
        (",Tile,a,why,owner", "empty boss"),
        ("Boss,Tile,a,,owner", "empty reason"),
        ("Boss,Tile,a,why,", "empty reviewer"),
        ("Boss,Ghost,a,why,owner", "unknown label 'Ghost'"),
        ("Boss,Tile,moon,why,owner", "unknown location_id 'moon'"),
        ("Boss,Tile,a,why,owner\nBoss,Tile,a,why,owner", "duplicate override"),
    ],
)
def test_bad_override_row_is_a_loader_error(tmp_path: Path, row: str, message: str) -> None:
    source = _override_file(tmp_path, row)

    with pytest.raises(LoaderError, match=message):
        load_boss_location_overrides(source, labels={"Tile"}, location_ids={"a"})
