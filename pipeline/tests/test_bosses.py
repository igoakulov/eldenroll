"""Tests for the boss instances against the real CSV and the owner's tables
(`data/README.md#Bosses`)."""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from pathlib import Path

import pytest

from eldenroll.build.boss_locations import MAX_LOCATION, with_locations
from eldenroll.build.boss_table import load_boss_instances, load_boss_overrides, load_boss_rows
from eldenroll.build.bosses import (
    DLC_TAG,
    BossOverrides,
    boss_identity,
    boss_pairs,
    build_boss_instances,
)
from eldenroll.errors import BuildError
from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.boss_overrides import (
    load_boss_additions,
    load_boss_merges,
    load_boss_names,
    load_boss_odds,
)
from eldenroll.loaders.region_areas import load_region_areas
from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.boss_instance import BossInstance
from eldenroll.paths import AREAS

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

ASHEN = "Leyndell, Ashen Capital"
ROYAL = "Leyndell, Royal Capital"
FARUM = "Crumbling Farum Azula"
DARRIWIL_ID = "bloodhound_knight_darriwil_limgrave_agheel_lake_south_forlorn_hound_evergaol"


@pytest.fixture(scope="module")
def instances() -> tuple[BossInstance, ...]:
    return build_boss_instances(load_boss_rows(), load_boss_overrides(OVERRIDES))


@pytest.fixture(scope="module")
def by_place(instances: tuple[BossInstance, ...]) -> dict[tuple[str, str], BossInstance]:
    return {(row.location_label, row.name): row for row in instances}


def test_the_counts_follow_the_arithmetic(instances: tuple[BossInstance, ...]) -> None:
    rows = load_boss_rows()
    overrides = load_boss_overrides(OVERRIDES)
    pairs = boss_pairs(rows)
    fights = Counter(
        (instance_label or label, name)
        for (label, _), (name, instance_label) in overrides.merges.items()
    )
    savings = sum(count - 1 for count in fights.values())

    assert len(instances) == len(pairs) - savings + len(overrides.additions)


def test_dryleaf_dane_has_only_his_own_fight(instances: tuple[BossInstance, ...]) -> None:
    assert [row.location_label for row in instances if row.name == "Dryleaf Dane"] == [
        "Scadu Altus - Moorth Ruins, Bonny Village West Entrance"
    ]


def test_every_pair_of_the_csv_has_an_instance(instances: tuple[BossInstance, ...]) -> None:
    overrides = load_boss_overrides(OVERRIDES)
    placed = {(row.location_label, row.name) for row in instances}
    for label, identity in boss_pairs(load_boss_rows()):
        name = overrides.names.get((identity, label)) or overrides.names.get(
            (identity, ""), identity
        )
        name, instance_label = overrides.merges.get((label, identity), (name, ""))
        assert ((instance_label or label).removeprefix(DLC_TAG), name) in placed, (label, identity)


def test_no_source_markup_reaches_a_row(instances: tuple[BossInstance, ...]) -> None:
    for row in instances:
        assert not any(mark in row.name for mark in ("[", "(", " - Broken", "EB - ", "PCR - "))
        assert not row.location_label.startswith(DLC_TAG)
    assert len({row.id for row in instances}) == len(instances)


def test_the_docs_ids_are_built_as_written(instances: tuple[BossInstance, ...]) -> None:
    ids = {row.id for row in instances}
    assert {DARRIWIL_ID, "cleanrot_knight_abandoned_cave"} <= ids


@pytest.mark.parametrize(
    ("label", "instance", "gone"),
    [
        (ASHEN, "Godfrey, First Elden Lord", "Godfrey - Hoarah Loux, Warrior"),
        ("Stone Platform", "Radagon / Elden Beast", "EB - Elden Beast"),
        (FARUM, "Maliketh, the Black Blade", "Beast Clergyman"),
        (FARUM, "Godskin Duo", "Godskin Apostle"),
    ],
)
def test_one_fight_is_one_instance(
    by_place: dict[tuple[str, str], BossInstance], label: str, instance: str, gone: str
) -> None:
    assert (label, instance) in by_place
    assert (label, gone) not in by_place


@pytest.mark.parametrize(
    ("label", "name"),
    [
        ("Tombsward Cave", "Miranda the Blighted Bloom"),
        ("Limgrave - Agheel Lake South, Forlorn Hound Evergaol", "Bloodhound Knight Darriwil"),
    ],
)
def test_the_owner_names_are_applied(
    by_place: dict[tuple[str, str], BossInstance], label: str, name: str
) -> None:
    assert (label, name) in by_place


def test_every_instance_resolves_to_a_location_and_region(
    instances: tuple[BossInstance, ...],
) -> None:
    locations = {area.name for area in load_annotations(AREAS).areas}
    assert {row.location_id for row in instances} <= locations


@pytest.mark.parametrize(
    ("label", "name", "region"),
    [
        (ASHEN, "Godfrey, First Elden Lord", "leyndell_ashen"),
        (ROYAL, "Godfrey, First Elden Lord", "leyndell"),
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
    merges: dict[tuple[str, str], tuple[str, str]] | None = None,
    names: dict[tuple[str, str], str] | None = None,
    additions: tuple[tuple[str, str, str], ...] = (),
    odds: dict[str, float] | None = None,
) -> BossOverrides:
    return BossOverrides(
        merges=merges or {},
        names=names or {},
        additions=additions,
        aliases={"Cave": "cave", "[DLC] Keep": "keep"},
        locations={},
        odds=odds or {},
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
        merges={("Cave", "Rat"): ("Rat & Bat", ""), ("Cave", "Bat"): ("Rat & Bat", "")},
        names={("Rat", ""): "Giant Rat"},
    )
    assert [row.id for row in build_boss_instances(ROWS, overrides)] == [
        "rat_bat_cave",
        "giant_rat_keep",
    ]


def test_a_merge_may_join_two_labels_under_its_own() -> None:
    overrides = _fixture(
        merges={("Cave", "Rat"): ("Rat", "Far Side"), ("[DLC] Keep", "Rat"): ("Rat", "Far Side")}
    )
    assert build_boss_instances(ROWS, overrides) == (
        BossInstance("rat_far_side", "Rat", "cave", "Far Side"),
        BossInstance("bat_cave", "Bat", "cave", "Cave"),
    )


def test_odds_default_to_one_and_a_row_can_set_them() -> None:
    linked = build_boss_instances(ROWS, _fixture(odds={"bat_cave": 0, "rat_keep": 2.5}))
    assert {row.id: row.odds for row in linked} == {"rat_cave": 1, "bat_cave": 0, "rat_keep": 2.5}


def test_an_odds_row_for_no_boss_stops_the_build() -> None:
    with pytest.raises(BuildError, match="boss_odds names no boss: cat_cave"):
        build_boss_instances(ROWS, _fixture(odds={"cat_cave": 0}))


def test_an_addition_brings_its_own_label_and_location() -> None:
    overrides = _fixture(additions=(("Dane", "Far Keep", "elsewhere"),))
    assert build_boss_instances(ROWS, overrides)[-1] == BossInstance(
        "dane_far_keep", "Dane", "elsewhere", "Far Keep"
    )


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        (
            _fixture(merges={("Cave", "Cat"): ("A", ""), ("Cave", "Rat"): ("A", "")}),
            "boss_merges names no",
        ),
        (_fixture(merges={("Cave", "Rat"): ("A", "")}), "boss_merges joins nothing"),
        (_fixture(names={("Cat", ""): "A"}), "boss_names corrects no"),
        (_fixture(names={("Rat", "Elsewhere"): "A"}), "boss_names corrects no"),
    ],
)
def test_a_bad_override_stops_the_build(overrides: BossOverrides, message: str) -> None:
    with pytest.raises(BuildError, match=message):
        build_boss_instances(ROWS, overrides)


def test_two_instances_with_one_id_stop_the_build() -> None:
    with pytest.raises(BuildError, match="share the id"):
        build_boss_instances((("Cave", "R-at [Boss]"), ("Cave", "R at [Boss]")), _fixture())


def test_an_addition_of_a_tagged_boss_stops_the_build() -> None:
    with pytest.raises(BuildError, match="already in the pool"):
        build_boss_instances(ROWS, _fixture(additions=(("Bat", "Cave", "cave"),)))


def test_a_boss_with_no_alias_stops_the_build() -> None:
    with pytest.raises(BuildError, match="has no alias"):
        build_boss_instances((("Nowhere", "Rat [Boss]"),), _fixture())


MERGE_HEADER = "label,csv_name,instance,instance_label,reason\n"
ADDITION_HEADER = "name,location_label,location_id,reason\n"
ODDS_HEADER = "boss,odds,reason\n"


def _load_additions(path: Path) -> object:
    return load_boss_additions(path, location_ids={"cave"})


@pytest.mark.parametrize(
    ("loader", "text", "message"),
    [
        (load_boss_merges, f"{MERGE_HEADER}A,B,,,why\n", "empty instance"),
        (load_boss_merges, f"{MERGE_HEADER}A,B,C,,\n", "empty reason"),
        (load_boss_merges, f"{MERGE_HEADER}A,B,C,,why\nA,B,D,,why\n", "duplicate row"),
        (load_boss_names, "csv_name,label,name,reason\nA,,,why\n", "empty name"),
        (_load_additions, f"{ADDITION_HEADER}A,,cave,why\n", "empty location_label"),
        (_load_additions, f"{ADDITION_HEADER}A,B,nowhere,why\n", "unknown location_id"),
        (
            _load_additions,
            f"{ADDITION_HEADER}A,B,cave,why\nA,B,cave,why\n",
            "duplicate",
        ),
        (_load_additions, ADDITION_HEADER, "no rows"),
        (load_boss_odds, f"{ODDS_HEADER}a,-1,why\n", "has odds"),
        (load_boss_odds, f"{ODDS_HEADER}a,many,why\n", "has odds"),
        (load_boss_odds, f"{ODDS_HEADER}a,nan,why\n", "has odds"),
        (load_boss_odds, f"{ODDS_HEADER}a,,why\n", "empty odds"),
        (load_boss_odds, f"{ODDS_HEADER}a,1,\n", "empty reason"),
        (load_boss_odds, f"{ODDS_HEADER}a,1,why\na,2,why\n", "duplicate boss"),
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
    path.write_text("csv_name,label,name,reason\nA,,B,why\n", encoding="utf-8")
    assert load_boss_names(path) == {("A", ""): "B"}


def test_every_fight_shows_a_short_location_that_tells_it_apart() -> None:
    shown = {(row.name, row.location_label): row.location for row in load_boss_instances(OVERRIDES)}
    assert max(len(location) for location in shown.values()) <= MAX_LOCATION
    assert shown[("Night's Cavalry", "Bellum Highway - East Raya Lucaria Gate")] == (
        "Liurnia, Bellum Highway"
    )
    assert shown[("Night's Cavalry", "Liurnia of the Lakes - Liurnia Highway Far North")] == (
        "Liurnia, Gate Town Bridge"
    )
    assert shown[("Fell Twin", "Divine Tower of East Altus")] == (
        "Capital Outskirts, Divine Tower of East Altus"
    )


def test_a_place_reads_area_then_place_unless_an_override_says_otherwise() -> None:
    bosses = (
        BossInstance("rat_a", "Rat", "cave", "A"),
        BossInstance("rat_b", "Rat", "cave", "B"),
        BossInstance("bat_c", "Bat", "road", "C"),
    )
    names = {"cave": "Caelid - Gael Tunnel", "road": "Bellum Highway"}
    shown = with_locations(
        bosses, names, {"road": ("Liurnia", "Bellum Highway")}, {("Rat", "B"): "Far End"}
    )
    assert [row.location for row in shown] == [
        "Caelid, Gael Tunnel",
        "Caelid, Far End",
        "Liurnia, Bellum Highway",
    ]
    with pytest.raises(BuildError, match="read the same"):
        with_locations(bosses, names, {}, {})
