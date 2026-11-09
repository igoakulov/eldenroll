"""Tests for the consumable rows and the whole catalog (`data.md` §4.1, §4.9)."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from eldenroll.build.armor import build_armor
from eldenroll.build.ashes import build_ashes
from eldenroll.build.consumables import NAMED_THROWABLES, NOT_AN_ITEM, build_consumables
from eldenroll.build.items import build_item_table, none_item
from eldenroll.build.spells import build_incantations, build_sorceries
from eldenroll.build.talismans import build_talismans
from eldenroll.build.tools import TOOLS, TRANSFORMS, build_tools
from eldenroll.build.weapons import build_weapons
from eldenroll.errors import BuildError
from eldenroll.loaders.added_items import load_added_items
from eldenroll.loaders.ash_sources import load_ash_sources
from eldenroll.loaders.consumables import load_consumable_categories
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.loaders.iteminfo import load_item_catalog
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.loaders.weapons import load_weapon_categories
from eldenroll.model.item import Item
from eldenroll.paths import ITEM_INFO, TOOL_CONSUMABLE_CLASSES, WEAPON_SHIELD_CLASSES

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"


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


def test_named_throwables_are_18() -> None:
    assert len(NAMED_THROWABLES) == 18


def test_rows_names_and_slugs_are_all_81(consumables: tuple[Item, ...]) -> None:
    assert len(consumables) == 81
    assert len({row.name for row in consumables}) == 81
    assert len({row.id for row in consumables}) == 81
    assert {row.category for row in consumables} == {"consumable"}


def test_class_split_is_50_6_25(consumables: tuple[Item, ...]) -> None:
    assert Counter(row.subcategory for row in consumables) == {
        "pots": 50,
        "perfumes": 6,
        "throwables": 25,
    }


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


def test_later_steps_own_the_remaining_fields(consumables: tuple[Item, ...]) -> None:
    for row in consumables:
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert row.image is None
        assert row.alias is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


def test_the_whole_catalog_joins_into_1514_rows(consumables: tuple[Item, ...]) -> None:
    catalog = load_item_catalog(ITEM_INFO)
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pools = {
        "weapons": build_weapons(
            catalog,
            variants,
            load_added_items(OVERRIDES / "items.csv"),
            load_weapon_categories(WEAPON_SHIELD_CLASSES),
        ),
        "armor": build_armor(catalog, variants),
        "talismans": build_talismans(catalog),
        "ashes": build_ashes(catalog, variants, load_ash_sources(OVERRIDES / "ash_sources.csv")),
        "sorceries": build_sorceries(catalog, variants),
        "incantations": build_incantations(catalog, variants),
        "tools": build_tools(catalog, load_consumable_categories(TOOL_CONSUMABLE_CLASSES)),
        "consumables": consumables,
    }
    rows = (*(row for pool in pools.values() for row in pool), none_item())

    table = build_item_table(rows)

    assert {name: len(pool) for name, pool in pools.items()} == {
        "weapons": 487,
        "armor": 631,
        "talismans": 41,
        "ashes": 111,
        "sorceries": 67,
        "incantations": 86,
        "tools": 9,
        "consumables": 81,
    }
    assert len(table) == 1514
    assert [row.id for row in table if row.category == "none"] == ["none"]
    assert "none_none" not in {row.id for row in table}
    assert {row.id for row in rows} - {row.id for row in table} == {
        "glintstone_pebble",
        "carian_greatsword",
        "glintblade_phalanx",
    }


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
