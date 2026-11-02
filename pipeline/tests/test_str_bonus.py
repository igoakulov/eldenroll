"""Tests for `str_bonus_2h` against the real sources (`prd.md` §6.4)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.items import new_item, none_item
from eldenrando.errors import BuildError
from eldenrando.loaders.schema import LoaderError
from eldenrando.loaders.str_bonus import load_str_bonus
from eldenrando.model.item import Item
from eldenrando.model.vocabulary import NO_STR_BONUS
from eldenrando.normalize.str_bonus import assign_str_bonus
from eldenrando.validate.gaps import GapSources, load_sources

ROOT = Path(__file__).resolve().parents[2]
ITEMINFO = ROOT / "raw" / "pc_mod_data" / "iteminfo.txt"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")

PAIRED = {
    "Ornamental Straight Sword",
    "Rellana's Twin Blades",
    "Greatsword of Radahn (Lord)",
    "Greatsword of Radahn (Light)",
    "Falx",
    "Dancing Blade of Ranah",
    "Horned Warrior's Sword",
    "Death Knight's Twin Axes",
}


@pytest.fixture(scope="module")
def table() -> tuple[Item, ...]:
    sources: GapSources = load_sources(ROOT)
    return sources.table


@needs_files
def test_every_exception_class_item_is_false_but_grafted_dragon(table: tuple[Item, ...]) -> None:
    keeps_it = {row.name for row in table if row.subcategory in NO_STR_BONUS and row.str_bonus_2h}
    assert keeps_it == {"Grafted Dragon"}


@needs_files
def test_false_outside_the_classes_is_only_the_paired_list(table: tuple[Item, ...]) -> None:
    false = {
        row.name
        for row in table
        if row.category in ("weapon", "shield")
        and row.str_bonus_2h is False
        and row.subcategory not in NO_STR_BONUS
    }
    assert false == PAIRED


@needs_files
def test_counts(table: tuple[Item, ...]) -> None:
    weapons = [row for row in table if row.category in ("weapon", "shield")]
    assert len(weapons) == 487
    assert sum(row.str_bonus_2h is False for row in weapons) == 48
    assert sum(row.str_bonus_2h is True for row in weapons) == 439


@needs_files
@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Longsword", True),
        ("Starscourge Greatsword", True),
        ("Grafted Dragon", True),
        ("Caestus", False),
        ("Falx", False),
        ("Greatbow", False),
        ("Hand Ballista", False),
        ("Backhand Blade", False),
        ("Lordsworn's Straight Sword", True),
        ("Brass Shield", True),
    ],
)
def test_weapon_has_its_bonus(table: tuple[Item, ...], name: str, expected: bool) -> None:
    assert next(row for row in table if row.name == name).str_bonus_2h is expected


@needs_files
def test_other_categories_stay_null(table: tuple[Item, ...]) -> None:
    others = [row for row in table if row.category not in ("weapon", "shield", "none")]
    assert others
    assert all(row.str_bonus_2h is None for row in others)
    assert next(row for row in table if row.category == "none").str_bonus_2h is False


def test_class_sets_the_default_and_the_override_wins() -> None:
    rows = assign_str_bonus(
        [
            new_item("A", "weapon", subcategory="katana"),
            new_item("B", "weapon", subcategory="fist"),
            new_item("C", "weapon", subcategory="fist"),
            new_item("D", "weapon", subcategory="katana"),
            new_item("E", "shield", subcategory="small_shield"),
        ],
        {"C": True, "D": False},
    )
    assert [row.str_bonus_2h for row in rows] == [True, False, True, False, True]


def test_other_categories_are_left_alone() -> None:
    rows = assign_str_bonus([new_item("A", "talisman"), none_item()], {})
    assert [row.str_bonus_2h for row in rows] == [None, False]


@pytest.mark.parametrize("name", ["Nope", "Talisman"])
def test_override_naming_no_weapon_stops_the_build(name: str) -> None:
    with pytest.raises(BuildError, match=f"name no weapon: {name}"):
        assign_str_bonus([new_item("Talisman", "talisman")], {name: False})


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("A,maybe,why,owner", "str_bonus_2h is"),
        ("A,true,,owner", "empty reason"),
        ("A,true,why,owner\nA,false,why,owner", "duplicate item"),
    ],
)
def test_bad_override_row_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "str_bonus_2h.csv"
    path.write_text(f"item,str_bonus_2h,reason,reviewer\n{line}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_str_bonus(path)
