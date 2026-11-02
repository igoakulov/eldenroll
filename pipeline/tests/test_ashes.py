"""Tests for the ash rows against the real sources (`data.md` §4.5)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from eldenrando.build.armor import build_armor
from eldenrando.build.ashes import EXCLUDED, build_ashes
from eldenrando.build.items import build_item_table
from eldenrando.build.talismans import build_talismans
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.ash_sources import load_ash_sources
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.schema import LoaderError
from eldenrando.loaders.weapons import load_ash_compatibility, load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import CatalogGroup, ItemCatalog

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
RAW = ROOT / "raw"
ITEMINFO = RAW / "pc_mod_data" / "iteminfo.txt"
WEAPON_SHEET = RAW / "csv" / "weapons_shields_categories.csv"
COMPATIBILITY = RAW / "csv" / "ashes_compatibility_no_DLC.csv"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")

ASH_SOURCES = OVERRIDES / "ash_sources.csv"
NOT_IN_THE_COMPATIBILITY_SHEET = {
    "Aspects of the Crucible: Wings",
    "Blind Spot",
    "Blinkbolt",
    "Carian Sovereignty",
    "Divine Beast Frost Stomp",
    "Dryleaf Whirlwind",
    "Flame Skewer",
    "Flame Spear",
    "Ghostflame Call",
    "Igon's Drake Hunt",
    "Overhead Stance",
    "Palm Blast",
    "Piercing Throw",
    "Raging Beast",
    "Rolling Sparks",
    "Savage Lion's Claw",
    "Scattershot Throw",
    "Shield Strike",
    "Shriek of Sorrow",
    "Spinning Gravity Thrust",
    "Swift Slash",
    "The Poison Flower Blooms Twice",
    "Wall of Sparks",
    "Wing Stance",
}


def _catalog(names: dict[int, str]) -> ItemCatalog:
    group = CatalogGroup(
        name="gems",
        items={"gem": tuple(names)},
        item_count=len(names),
        location_count=0,
        unique_count=0,
    )
    return ItemCatalog(
        names={"gem": names},
        counts={},
        unique_counts={},
        groups={"gems": group},
        locations=(),
    )


@pytest.fixture(scope="module")
def catalog() -> ItemCatalog:
    return load_item_catalog(ITEMINFO)


@pytest.fixture(scope="module")
def ashes(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_ashes(
        catalog,
        load_name_variants(OVERRIDES / "name_variants.csv"),
        load_ash_sources(ASH_SOURCES),
    )


@pytest.fixture(scope="module")
def names(ashes: tuple[Item, ...]) -> set[str]:
    return {row.name for row in ashes}


@needs_files
def test_rows_names_and_slugs_are_all_111(ashes: tuple[Item, ...]) -> None:
    assert len(ashes) == 111
    assert len({row.name for row in ashes}) == 111
    assert len({row.id for row in ashes}) == 111
    assert {row.category for row in ashes} == {"ash"}


@needs_files
@pytest.mark.parametrize("name", [*sorted(EXCLUDED), "Savage Claws"])
def test_ash_is_absent(names: set[str], name: str) -> None:
    assert name not in names


def test_ash_sources_file_lists_every_weapon() -> None:
    assert load_ash_sources(ASH_SOURCES) == {
        "Piercing Fang": ("Nagakiba",),
        "Spinning Strikes": ("Banished Knight's Halberd +8",),
        "Glintblade Phalanx": ("Rogier's Rapier +8",),
        "Braggart's Roar": ("Iron Ball", "Battle Hammer", "Rotten Battle Hammer"),
        "Blind Spot": ("Backhand Blade", "Reverse-Bladed Sword", "Smithscript Cirque"),
        "Spinning Gravity Thrust": ("Sword Lance",),
        "Overhead Stance": ("Great Katana", "Reed Great Katana"),
        "Palm Blast": ("Dryleaf Arts", "Dane's Footwork"),
        "Shield Strike": ("Dueling Shield", "Carian Thrusting Shield", "Ritual Thrusting Shield"),
        "Igon's Drake Hunt": ("Igon's Greatbow",),
    }


@needs_files
def test_every_source_weapon_is_in_the_weapon_pool(catalog: ItemCatalog) -> None:
    weapons = build_weapons(
        catalog,
        load_name_variants(OVERRIDES / "name_variants.csv"),
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHEET),
    )
    pool = {row.name for row in weapons}
    sources = load_ash_sources(ASH_SOURCES)

    named = {weapon for weapons_of_ash in sources.values() for weapon in weapons_of_ash}

    assert {re.sub(r" \+\d+$", "", weapon) for weapon in named} <= pool


@needs_files
@pytest.mark.parametrize(
    "weapon", ["Banished Knight's Halberd +8", "Rogier's Rapier +8", "Igon's Greatbow"]
)
def test_upgraded_source_is_named_as_the_slot_lines_name_it(weapon: str) -> None:
    text = (RAW / "pc_mod_data" / "itemslots_stable.txt").read_text(encoding="utf-8")

    assert f"{weapon} - lot " in text or f"{weapon} - enemy lot " in text


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("Parry,Dagger,,owner", "empty reason"),
        ("Parry,Dagger,why,", "empty reviewer"),
        (",Dagger,why,owner", "empty ash"),
    ],
)
def test_incomplete_ash_source_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "ash_sources.csv"
    path.write_text(f"ash,weapon,reason,reviewer\n{line}\n")

    with pytest.raises(LoaderError, match=message):
        load_ash_sources(path)


def test_repeated_ash_source_stops_the_load(tmp_path: Path) -> None:
    path = tmp_path / "ash_sources.csv"
    path.write_text("ash,weapon,reason,reviewer\nParry,Dagger,why,owner\nParry,Dagger,why,owner\n")

    with pytest.raises(LoaderError, match="duplicate weapon 'Dagger'"):
        load_ash_sources(path)


@needs_files
@pytest.mark.parametrize(
    "name",
    [
        "Wall of Sparks",
        "Rolling Sparks",
        "Parry",
        "Carian Retaliation",
        "Golden Parry",
        "Storm Wall",
        "Thops's Barrier",
        "Spinning Weapon",
        "No Skill",
    ],
)
def test_ash_is_present(names: set[str], name: str) -> None:
    assert name in names


@needs_files
def test_no_name_keeps_the_prefix(names: set[str]) -> None:
    assert not [name for name in names if "ash of war" in name.lower()]


@needs_files
def test_later_steps_own_the_remaining_fields(ashes: tuple[Item, ...]) -> None:
    for row in ashes:
        assert row.subcategory is None
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


@needs_files
def test_compatibility_sheet_differs_from_the_pool_only_as_known(names: set[str]) -> None:
    table = load_ash_compatibility(COMPATIBILITY)
    column = table.column("Name")
    sheet = {row[column] for row in table.rows if row[column]}

    assert sheet - names == EXCLUDED
    assert names - sheet == NOT_IN_THE_COMPATIBILITY_SHEET


@needs_files
def test_every_json_ash_maps_to_the_pool_or_is_known(names: set[str]) -> None:
    pool = {name.lower() for name in names}
    unmatched: set[str] = set()
    for record in load_document(RAW / "json-no-dlc", "ashes").records:
        name = re.sub(r"^Ash(es)? Of War: ", "", str(record["name"]))
        if name.lower() not in pool:
            unmatched.add(name)

    assert unmatched == EXCLUDED | {"Lost Ashes Of War"}


@needs_files
def test_pools_so_far_join_without_a_collision(
    catalog: ItemCatalog, ashes: tuple[Item, ...]
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    weapons = build_weapons(
        catalog,
        variants,
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHEET),
    )
    rows = (*weapons, *build_armor(catalog, variants), *build_talismans(catalog), *ashes)

    table = build_item_table(rows)

    assert len(table) == 1270
    assert [row.id for row in table] == [row.id for row in rows]


def test_exclusion_naming_no_ash_stops_the_build() -> None:
    with pytest.raises(BuildError, match="exclusion"):
        build_ashes(_catalog({1: "Ash of War: Parry"}), {}, ())


def test_name_without_the_prefix_stops_the_build() -> None:
    with pytest.raises(BuildError, match="without the prefix: Parry"):
        build_ashes(_catalog({1: "Parry"}), {}, ())


def test_added_ash_the_group_already_holds_stops_the_build() -> None:
    names = {index: f"Ash of War: {name}" for index, name in enumerate(sorted(EXCLUDED))}
    names[99] = "Ash of War: Parry"

    with pytest.raises(BuildError, match="already in the group: Parry"):
        build_ashes(_catalog(names), {}, ("Parry",))


def test_prefix_is_dropped_and_exclusions_removed() -> None:
    names = {index: f"Ash of War: {name}" for index, name in enumerate(sorted(EXCLUDED))}
    names[99] = "Ash of War: Parry"

    rows = build_ashes(_catalog(names), {}, ("Added",))

    assert [(row.id, row.name) for row in rows] == [("parry", "Parry"), ("added", "Added")]
