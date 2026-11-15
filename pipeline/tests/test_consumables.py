"""Tests for the consumable rows and the whole catalog (`data/README.md#Scope`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.consumables import NAMED_THROWABLES, NOT_AN_ITEM, build_consumables
from eldenroll.build.tools import TOOLS, TRANSFORMS
from eldenroll.errors import BuildError
from eldenroll.loaders.consumables import load_consumable_categories
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.model.item import Item
from eldenroll.paths import TOOL_CONSUMABLE_CLASSES


def _sheet(*rows: tuple[str, str, str]) -> CsvTable:
    throwables = tuple((name, "-", "-") for name in sorted(NAMED_THROWABLES))
    return CsvTable(
        path=Path("sheet.csv"),
        header_row=0,
        header=("Name", "subCategory1", "subCategory2"),
        rows=(*throwables, *rows),
    )


@pytest.fixture(scope="module")
def consumables() -> tuple[Item, ...]:
    return build_consumables(load_consumable_categories(TOOL_CONSUMABLE_CLASSES))


@pytest.fixture(scope="module")
def names(consumables: tuple[Item, ...]) -> set[str]:
    return {row.name for row in consumables}


@pytest.mark.parametrize("name", [NOT_AN_ITEM, *TOOLS, *TRANSFORMS])
def test_name_outside_the_pool_is_absent(names: set[str], name: str) -> None:
    assert name not in names


@pytest.mark.parametrize(
    ("name", "subcategory"),
    [
        ("Hefty Fire Pot", "pots"),
        ("Roped Fire Pot", "pots"),
        ("Bloodboil Aromatic", "perfumes"),
        ("Poison Spraymist", "perfumes"),
        ("Kukri", "throwables"),
        ("Explosive Stone Clump", "throwables"),
        ("Innard Meat", "throwables"),
        ("Spritestone", "throwables"),
        ("Surging Frenzied Flame", "throwables"),
    ],
)
def test_consumable_has_its_class(
    consumables: tuple[Item, ...], name: str, subcategory: str
) -> None:
    assert {row.name: row.subcategory for row in consumables}[name] == subcategory


def test_folded_rows_become_one_item() -> None:
    pot = "Cracked / Ritual Pot"

    rows = build_consumables(_sheet(("Fire Pot 1", pot, "-"), ("Fire Pot 2", pot, "-")))

    assert [row.name for row in rows].count("Fire Pot") == 1


def test_consumable_that_fits_no_class_stops_the_build() -> None:
    with pytest.raises(BuildError, match="'Mystery' fits no class"):
        build_consumables(_sheet(("Mystery", "-", "-")))


def test_named_throwable_missing_from_the_sheet_stops_the_build() -> None:
    table = CsvTable(
        path=Path("sheet.csv"),
        header_row=0,
        header=("Name", "subCategory1", "subCategory2"),
        rows=(("Fire Pot", "Cracked / Ritual Pot", "-"),),
    )

    with pytest.raises(BuildError, match="not in the sheet"):
        build_consumables(table)
