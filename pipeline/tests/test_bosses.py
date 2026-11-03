"""Tests for the boss instances against the real CSV and the owner's tables (`data.md` §6)."""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from pathlib import Path

import pytest

from eldenrando.build.bosses import (
    DLC_TAG,
    BossOverrides,
    boss_identity,
    boss_pairs,
    build_boss_instances,
)
from eldenrando.errors import BuildError
from eldenrando.loaders.annotations import load_annotations
from eldenrando.loaders.boss_overrides import (
    load_boss_additions,
    load_boss_merges,
    load_boss_names,
)
from eldenrando.loaders.bosses import load_boss_creature_locations
from eldenrando.loaders.location_aliases import (
    load_boss_location_overrides,
    load_location_aliases,
)
from eldenrando.loaders.region_areas import load_region_areas
from eldenrando.loaders.regions import load_regions
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.boss_instance import BossInstance

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
RAW = ROOT / "raw"
ANNOTATIONS = RAW / "pc_mod_data" / "annotations_stable.txt"
needs_files = pytest.mark.skipif(not ANNOTATIONS.is_file(), reason="raw data not present")

ASHEN = "Leyndell, Ashen Capital"
ROYAL = "Leyndell, Royal Capital"
FARUM = "Crumbling Farum Azula"
GELMIR = "Mt. Gelmir - Primeval Sorcerer Azur, Gelmir Hero's Grave Entrance"
SELLIA = "Caelid - West Sellia, Sellia Crystal Tunnel Entrance"
DARRIWIL_ID = "bloodhound_knight_darriwil_limgrave_agheel_lake_south_forlorn_hound_evergaol"


def _rows() -> tuple[tuple[str, str], ...]:
    table = load_boss_creature_locations(RAW / "csv" / "boss_creature_locations.csv")
    label = table.column("Location")
    name = table.column("Name")
    return tuple((row[label], row[name]) for row in table.rows)


def _overrides() -> BossOverrides:
    location_ids = {area.name for area in load_annotations(ANNOTATIONS).areas}
    aliases = load_location_aliases(OVERRIDES / "location_aliases.csv", location_ids=location_ids)
    return BossOverrides(
        merges=load_boss_merges(OVERRIDES / "boss_merges.csv"),
        names=load_boss_names(OVERRIDES / "boss_names.csv"),
        additions=load_boss_additions(OVERRIDES / "boss_additions.csv"),
        aliases=aliases,
        locations=load_boss_location_overrides(
            OVERRIDES / "boss_location_overrides.csv", labels=aliases, location_ids=location_ids
        ),
    )


@pytest.fixture(scope="module")
def instances() -> tuple[BossInstance, ...]:
    return build_boss_instances(_rows(), _overrides())


@pytest.fixture(scope="module")
def by_place(instances: tuple[BossInstance, ...]) -> dict[tuple[str, str], BossInstance]:
    return {(row.location_label, row.name): row for row in instances}


@needs_files
def test_the_counts_follow_the_arithmetic(instances: tuple[BossInstance, ...]) -> None:
    rows = _rows()
    overrides = _overrides()
    pairs = boss_pairs(rows)
    fights = Counter((label, name) for (label, _), name in overrides.merges.items())
    savings = sum(count - 1 for count in fights.values())

    assert sum("[Boss]" in name for _, name in rows) == 254
    assert len(pairs) == 222
    assert len(fights) == 14
    assert savings == 15
    assert len(instances) == len(pairs) - savings + len(overrides.additions) == 209


@needs_files
def test_the_base_game_and_dlc_split(instances: tuple[BossInstance, ...]) -> None:
    dlc = {label.removeprefix(DLC_TAG) for label, _ in _rows() if label.startswith(DLC_TAG)}
    assert sum(row.location_label in dlc for row in instances) == 42
    assert sum(row.location_label not in dlc for row in instances) == 167


@needs_files
def test_every_pair_of_the_csv_has_an_instance(instances: tuple[BossInstance, ...]) -> None:
    overrides = _overrides()
    placed = {(row.location_label, row.name) for row in instances}
    for label, identity in boss_pairs(_rows()):
        name = overrides.merges.get((label, identity)) or (
            overrides.names.get((identity, label))
            or overrides.names.get((identity, ""))
            or identity
        )
        assert (label.removeprefix(DLC_TAG), name) in placed, (label, identity)


@needs_files
def test_no_source_markup_reaches_a_row(instances: tuple[BossInstance, ...]) -> None:
    for row in instances:
        assert not any(mark in row.name for mark in ("[", "(", " - Broken", "EB - ", "PCR - "))
        assert not row.location_label.startswith(DLC_TAG)
    assert len({row.id for row in instances}) == len(instances)


@needs_files
def test_the_docs_ids_are_built_as_written(instances: tuple[BossInstance, ...]) -> None:
    ids = {row.id for row in instances}
    assert {DARRIWIL_ID, "cleanrot_knight_abandoned_cave"} <= ids


@needs_files
@pytest.mark.parametrize(
    ("label", "instance", "gone"),
    [
        (ASHEN, "Godfrey, First Elden Lord", "Godfrey - Hoarah Loux, Warrior"),
        ("Miquella's Haligtree - Elphael", "Malenia, Blade of Miquella", "Malenia, Goddess of Rot"),
        ("Stone Platform", "Radagon / Elden Beast", "EB - Elden Beast"),
        ("Enir-Ilim", "Promised Consort Radahn", "PCR - Radahn, Consort of Miquella"),
        (
            "Specimen Storehouse - Shadow Tower",
            "Messmer the Impaler",
            "Messmer - Base Serpent Messmer",
        ),
        (FARUM, "Maliketh, The Black Blade", "Beast Clergyman"),
        ("Volcano Manor", "Rykard, Lord of Blasphemy", "God-Devouring Serpent"),
        ("Auriza Hero's Grave", "Crucible Knight Ordovis", "Crucible Knight"),
        ("Caelid - Redmane Castle", "Misbegotten Warrior / Crucible Knight", "Crucible Knight"),
        (FARUM, "Godskin Duo", "Godskin Apostle"),
        ("Spiritcaller Cave", "Spiritcaller Snail", "Godskin Noble"),
        (SELLIA, "Nox Swordstress & Nox Monk", "Nox Priest"),
        ("Perfumer's Grotto", "Omenkiller & Miranda the Blighted Bloom", "Omenkiller"),
        ("Unsightly Catacombs", "Perfumer Tricia & Misbegotten Warrior", "Misbegotten Warrior"),
    ],
)
def test_one_fight_is_one_instance(
    by_place: dict[tuple[str, str], BossInstance], label: str, instance: str, gone: str
) -> None:
    assert (label, instance) in by_place
    assert (label, gone) not in by_place


@needs_files
@pytest.mark.parametrize(
    ("label", "name"),
    [
        ("Liurnia of the Lakes - Scenic Isle, Laskyar Ruins", "Deathbird"),
        ("Stormhill - Warmaster's Shack, Stormgate", "Deathbird"),
        ("Weeping Peninsula - Castle Morne Approach North", "Deathbird"),
        ("Capital Outskirts - Minor Erdtree", "Deathbird"),
        ("Liurnia of the Lakes - Gate Town Northwest", "Death Rite Bird"),
        ("Consecrated Snowfield - Ordina, Liturgical Town", "Death Rite Bird"),
        ("Caelid - Southern Aeonia Swamp Bank", "Death Rite Bird"),
        ("Charo's Hidden Grave - South Central Lake", "Death Rite Bird"),
        ("Tombsward Cave", "Miranda the Blighted Bloom"),
        ("Cliffbottom Catacombs", "Erdtree Burial Watchdog"),
        ("Wyndham Catacombs", "Erdtree Burial Watchdog"),
        ("Altus Plateau - Erdtree-Gazing Hill, Lux Ruins", "Demi-Human Queen Gilika"),
        (GELMIR, "Demi-Human Queen Maggie"),
        ("Volcano Cave", "Demi-Human Queen Margot"),
        ("Cerulean Coast - Demi-Human Beach, Ravine North", "Demi-Human Queen Marigga"),
        ("Nokron, Eternal City - Boss", "Regal Ancestor Spirit"),
        ("Siofra River - Boss", "Ancestor Spirit"),
        ("Nokron", "Valiant Gargoyle"),
        ("Altus Plateau - Woodfolk Ruins, Minor Erdtree", "Wormface"),
        ("Limgrave - Agheel Lake South, Forlorn Hound Evergaol", "Bloodhound Knight Darriwil"),
        (ROYAL, "Godfrey, First Elden Lord"),
    ],
)
def test_the_owner_names_are_applied(
    by_place: dict[tuple[str, str], BossInstance], label: str, name: str
) -> None:
    assert (label, name) in by_place


@needs_files
def test_every_instance_resolves_to_a_location_and_region(
    instances: tuple[BossInstance, ...],
) -> None:
    locations = {area.name for area in load_annotations(ANNOTATIONS).areas}
    assert {row.location_id for row in instances} <= locations


@needs_files
@pytest.mark.parametrize(
    ("label", "name", "region"),
    [
        (ASHEN, "Godfrey, First Elden Lord", "leyndell_ashen"),
        (ROYAL, "Godfrey, First Elden Lord", "leyndell"),
        ("Stone Platform", "Radagon / Elden Beast", "leyndell_ashen"),
        ("Enir-Ilim", "Promised Consort Radahn", "dlc_enirilim"),
        (
            "Scadu Altus - Cathedral of Manus Metyr",
            "Count Ymir, Mother of Fingers",
            "dlc_gravesite",
        ),
        (
            "Scadu Altus - Moorth Ruins, Bonny Village West Entrance",
            "Dryleaf Dane",
            "dlc_gravesite",
        ),
        (
            "Mountaintops of the Giants - West of Castle Sol; Consecrated Snowfield - North of "
            "Minor Erdtree",
            "Putrid Avatar",
            "snowfield",
        ),
        (
            "Mountaintops of the Giants - West of Castle Sol; Consecrated Snowfield - North of "
            "Minor Erdtree",
            "Death Rite Bird",
            "mountaintops",
        ),
        (
            "Limgrave - Agheel Lake South, Forlorn Hound Evergaol",
            "Bloodhound Knight Darriwil",
            "limgrave",
        ),
    ],
)
def test_owner_confirmed_regions_hold_after_renames(
    by_place: dict[tuple[str, str], BossInstance], label: str, name: str, region: str
) -> None:
    regions = load_regions(OVERRIDES / "regions.csv")
    region_of_area = load_region_areas(
        OVERRIDES / "region_areas.csv", region_ids={row.id for row in regions}
    )
    assert region_of_area[by_place[(label, name)].location_id] == region


@pytest.mark.parametrize(
    ("name", "identity"),
    [
        ("Cleanrot Knight [Boss] (Sickle)", "Cleanrot Knight"),
        ("Crystalian  [Boss] (Spear) - Broken", "Crystalian"),
        ("Putrescent Knight [Boss] (Phase 2)", "Putrescent Knight"),
        ("Rennala, Full Moon [Boss] (Phase 1, Bubble DR)", "Rennala, Full Moon"),
    ],
)
def test_identity_strips_the_variants(name: str, identity: str) -> None:
    assert boss_identity(name) == identity


def _fixture(
    *,
    merges: dict[tuple[str, str], str] | None = None,
    names: dict[tuple[str, str], str] | None = None,
    additions: tuple[tuple[str, str], ...] = (),
) -> BossOverrides:
    return BossOverrides(
        merges=merges or {},
        names=names or {},
        additions=additions,
        aliases={"Cave": "cave", "[DLC] Keep": "keep"},
        locations={},
    )


ROWS = (
    ("Cave", "Rat [Boss] (Big)"),
    ("Cave", "Rat [Boss] (Small)"),
    ("Cave", "Bat [Boss]"),
    ("[DLC] Keep", "Rat [Boss]"),
    ("[DLC] Keep", "Dane"),
)


def test_variants_collapse_and_a_label_loses_its_tag() -> None:
    assert build_boss_instances(ROWS, _fixture()) == (
        BossInstance("rat_cave", "Rat", "cave", "Cave"),
        BossInstance("bat_cave", "Bat", "cave", "Cave"),
        BossInstance("rat_keep", "Rat", "keep", "Keep"),
    )


def test_a_merge_makes_one_instance_and_a_name_can_cover_every_label() -> None:
    overrides = _fixture(
        merges={("Cave", "Rat"): "Rat & Bat", ("Cave", "Bat"): "Rat & Bat"},
        names={("Rat", ""): "Giant Rat"},
    )
    assert [row.id for row in build_boss_instances(ROWS, overrides)] == [
        "rat_bat_cave",
        "giant_rat_keep",
    ]


def test_an_addition_needs_its_untagged_row() -> None:
    overrides = _fixture(additions=(("Dane", "[DLC] Keep"),))
    assert build_boss_instances(ROWS, overrides)[-1].id == "dane_keep"


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        (_fixture(merges={("Cave", "Cat"): "A", ("Cave", "Rat"): "A"}), "boss_merges names no"),
        (_fixture(merges={("Cave", "Rat"): "A"}), "boss_merges joins nothing"),
        (_fixture(names={("Cat", ""): "A"}), "boss_names corrects no"),
        (_fixture(names={("Rat", "Elsewhere"): "A"}), "boss_names corrects no"),
        (_fixture(additions=(("Cat", "Cave"),)), "the CSV has no"),
    ],
)
def test_a_bad_override_stops_the_build(overrides: BossOverrides, message: str) -> None:
    with pytest.raises(BuildError, match=message):
        build_boss_instances(ROWS, overrides)


def test_two_instances_with_one_id_stop_the_build() -> None:
    with pytest.raises(BuildError, match="share the id"):
        build_boss_instances((("Cave", "R-at [Boss]"), ("Cave", "R at [Boss]")), _fixture())


def test_a_tagged_addition_stops_the_build() -> None:
    with pytest.raises(BuildError, match="already tags"):
        build_boss_instances(
            (("Cave", "Rat"), ("Cave", "Rat [Boss]")), _fixture(additions=(("Rat", "Cave"),))
        )


def test_a_boss_with_no_alias_stops_the_build() -> None:
    with pytest.raises(BuildError, match="has no alias"):
        build_boss_instances((("Nowhere", "Rat [Boss]"),), _fixture())


MERGE_HEADER = "label,csv_name,instance,reason,reviewer\n"


@pytest.mark.parametrize(
    ("loader", "text", "message"),
    [
        (load_boss_merges, f"{MERGE_HEADER}A,B,,why,owner\n", "empty instance"),
        (load_boss_merges, f"{MERGE_HEADER}A,B,C,,owner\n", "empty reason"),
        (load_boss_merges, f"{MERGE_HEADER}A,B,C,why,owner\nA,B,D,why,owner\n", "duplicate row"),
        (load_boss_names, "csv_name,label,name,reason,reviewer\nA,,,why,owner\n", "empty name"),
        (load_boss_additions, "name,label,reason,reviewer\nA,,why,owner\n", "empty label"),
        (load_boss_additions, "name,label,reason,reviewer\n", "no rows"),
    ],
)
def test_a_bad_row_stops_the_load(
    tmp_path: Path, loader: Callable[[Path], object], text: str, message: str
) -> None:
    path = tmp_path / "overrides.csv"
    path.write_text(text, encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        loader(path)


def test_a_name_row_may_leave_the_label_empty(tmp_path: Path) -> None:
    path = tmp_path / "boss_names.csv"
    path.write_text("csv_name,label,name,reason,reviewer\nA,,B,why,owner\n", encoding="utf-8")
    assert load_boss_names(path) == {("A", ""): "B"}
