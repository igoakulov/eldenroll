"""Tests for the ash rows against the real sources (`data/README.md#Ashes`)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from eldenroll.build.ashes import EXCLUDED, build_ashes
from eldenroll.build.weapons import build_weapons
from eldenroll.errors import BuildError
from eldenroll.loaders.added_items import load_added_items
from eldenroll.loaders.ash_sources import load_ash_sources
from eldenroll.loaders.json_source import load_document
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.loaders.schema import LoaderError
from eldenroll.loaders.weapons import load_ash_compatibility, load_weapon_categories
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import CatalogGroup, ItemCatalog
from eldenroll.paths import (
    ASH_WEAPON_MATRIX,
    ITEM_SLOTS,
    ITEMS_DIR,
    WEAPON_SHIELD_CLASSES,
)
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

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
def catalog(sources: GapSources) -> ItemCatalog:
    return sources.catalog


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


@pytest.mark.parametrize("name", [*sorted(EXCLUDED), "Savage Claws"])
def test_ash_is_absent(names: set[str], name: str) -> None:
    assert name not in names


def test_every_source_weapon_is_in_the_weapon_pool(catalog: ItemCatalog) -> None:
    weapons = build_weapons(
        catalog,
        load_name_variants(OVERRIDES / "name_variants.csv"),
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHIELD_CLASSES),
    )
    pool = {row.name for row in weapons}
    sources = load_ash_sources(ASH_SOURCES)

    named = {weapon for weapons_of_ash in sources.values() for weapon in weapons_of_ash}

    assert {re.sub(r" \+\d+$", "", weapon) for weapon in named} <= pool


@pytest.mark.parametrize(
    "weapon", ["Banished Knight's Halberd +8", "Rogier's Rapier +8", "Igon's Greatbow"]
)
def test_upgraded_source_is_named_as_the_slot_lines_name_it(weapon: str) -> None:
    text = (ITEM_SLOTS).read_text(encoding="utf-8")

    assert f"{weapon} - lot " in text or f"{weapon} - enemy lot " in text


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("Parry,Dagger,", "empty reason"),
        (",Dagger,why", "empty ash"),
    ],
)
def test_incomplete_ash_source_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "ash_sources.csv"
    path.write_text(f"ash,weapon,reason\n{line}\n")

    with pytest.raises(LoaderError, match=message):
        load_ash_sources(path)


def test_repeated_ash_source_stops_the_load(tmp_path: Path) -> None:
    path = tmp_path / "ash_sources.csv"
    path.write_text("ash,weapon,reason\nParry,Dagger,why\nParry,Dagger,why\n")

    with pytest.raises(LoaderError, match="duplicate weapon 'Dagger'"):
        load_ash_sources(path)


def test_ash_is_present(names: set[str]) -> None:
    assert {"Wall of Sparks", "Rolling Sparks", "Parry", "Spinning Weapon", "No Skill"} <= names


def test_no_name_keeps_the_prefix(names: set[str]) -> None:
    assert not [name for name in names if "ash of war" in name.lower()]


def test_compatibility_sheet_differs_from_the_pool_only_as_known(names: set[str]) -> None:
    table = load_ash_compatibility(ASH_WEAPON_MATRIX)
    column = table.column("Name")
    sheet = {row[column] for row in table.rows if row[column]}

    assert sheet - names == EXCLUDED
    assert names - sheet == NOT_IN_THE_COMPATIBILITY_SHEET


def test_every_json_ash_maps_to_the_pool_or_is_known(names: set[str]) -> None:
    pool = {name.lower() for name in names}
    unmatched: set[str] = set()
    for record in load_document(ITEMS_DIR, "ashes").records:
        name = re.sub(r"^Ash(es)? Of War: ", "", str(record["name"]))
        if name.lower() not in pool:
            unmatched.add(name)

    assert unmatched == EXCLUDED | {"Lost Ashes Of War"}


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
