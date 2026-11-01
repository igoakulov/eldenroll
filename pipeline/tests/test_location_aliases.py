"""Tests for the label → area table against the CSVs and the mod's own map data."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.location_labels import labels_for_review, resolve_labels
from eldenrando.loaders.annotations import load_annotations
from eldenrando.loaders.bosses import load_boss_creature_locations
from eldenrando.loaders.drops import load_drop_locations
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.location_aliases import load_location_aliases
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
RAW = ROOT / "raw"
MOD_DATA = RAW / "pc_mod_data"
needs_files = pytest.mark.skipif(not MOD_DATA.is_dir(), reason="raw data not present")

DLC_TAG = "[DLC] "
MULTI_REGION_LABELS: dict[str, str] = {
    "Limgrave - Rear Gael Tunnel Entrance; Caelid - Gael Tunnel Entrance": "limgrave",
    (
        "Liurnia of the Lakes - Ravine-Veiled Village; Bellum Highway - Grand Lift of Dectus; "
        "Altus Plateau - Altus Plateau; Ruin-Strewn Precipice Entrance"
    ): "liurnia",
    (
        "Mountaintops of the Giants - Shack of the Lofty; Consecrated Snowfield - Minor "
        "Erdtree, Albinauric Rise, Cave of the Forlorn Entrance"
    ): "mountaintops",
    (
        "Mountaintops of the Giants - West of Castle Sol; Consecrated Snowfield - North of "
        "Minor Erdtree"
    ): "mountaintops",
    "[DLC] Northwest Gravesite Plain; West Scadu Altus; Rauh Ruins": "dlc_gravesite",
    "[DLC] Northwest Gravesite Plain; West Scadu Altus; Rauh Ruins (Unsealed)": "dlc_gravesite",
    (
        "[DLC] Southeast Gravesite Plain; Fort Reprimand; Foot of the Jagged Peak; North "
        "Finger Ruins of Rhia; West Abyssal Woods"
    ): "dlc_gravesite",
}


def _areas() -> tuple[Area, ...]:
    return load_annotations(MOD_DATA / "annotations_stable.txt").areas


def _aliases() -> dict[str, str]:
    return load_location_aliases(ALIASES_CSV, location_ids={area.name for area in _areas()})


def _drop_labels() -> set[str]:
    table = load_drop_locations(RAW / "csv" / "item_drop_locations.csv")
    column = table.column("Location")
    return {row[column] for row in table.rows}


def _boss_labels() -> set[str]:
    table = load_boss_creature_locations(RAW / "csv" / "boss_creature_locations.csv")
    label = table.column("Location")
    name = table.column("Name")
    return {row[label] for row in table.rows if "[Boss]" in row[name]}


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


@needs_files
def test_every_drop_and_boss_label_resolves() -> None:
    aliases = _aliases()
    drop_labels = _drop_labels()
    boss_labels = _boss_labels()

    assert len(aliases) == 481
    assert len(drop_labels) == 481
    assert len(boss_labels) == 185
    assert boss_labels <= drop_labels

    resolution = resolve_labels(drop_labels | boss_labels, aliases)
    assert resolution.unresolved == ()
    assert resolution.resolved == aliases


@needs_files
def test_alias_table_has_no_label_outside_the_sources() -> None:
    assert set(_aliases()) == _drop_labels()


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
    boss_labels = {label.removeprefix(DLC_TAG) for label in _boss_labels()}
    area_texts = {area.text for area in _areas()}
    records = load_document(RAW / "json-no-dlc", "locations").records
    json_names = {str(record["name"]).casefold() for record in records}

    verbatim = {label for label in boss_labels if label in area_texts}
    in_json = {label for label in boss_labels if label.casefold() in json_names}
    assert len(verbatim) == 27
    assert len(in_json) == 44
    assert len(boss_labels - verbatim - in_json) == 125


@needs_files
def test_jori_stays_with_the_catacombs_the_mod_gates_on() -> None:
    label = "[DLC] Abyssal Woods - Forsaken Graveyard, Darklight Catacombs Exit"

    assert _aliases()[label] == "scadualtus_catacombs"


@needs_files
def test_multi_region_labels_take_their_first_micro_location() -> None:
    regions = load_regions(OVERRIDES / "regions.csv")
    region_areas = load_region_areas(
        OVERRIDES / "region_areas.csv", region_ids={region.id for region in regions}
    )
    aliases = _aliases()

    actual = {label: region_areas[aliases[label]] for label in MULTI_REGION_LABELS}
    assert actual == MULTI_REGION_LABELS
    assert set(MULTI_REGION_LABELS) <= set(labels_for_review(aliases))


def test_missing_label_is_reported_not_dropped() -> None:
    resolution = resolve_labels(["b", "a", "a", "z"], {"a": "x", "unused": "y"})

    assert resolution.resolved == {"a": "x"}
    assert resolution.unresolved == ("b", "z")


def test_review_list_holds_only_multi_location_labels() -> None:
    aliases = {"Z - One; Y - Two": "z", "A - One, Two": "a", "B; C": "b"}

    assert labels_for_review(aliases) == ("B; C", "Z - One; Y - Two")


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
