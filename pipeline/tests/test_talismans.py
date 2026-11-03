"""Tests for the talisman rows against the real sources (`data.md` §4.4)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.armor import build_armor
from eldenrando.build.items import build_item_table
from eldenrando.build.talismans import SHORTLIST, build_talismans
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.weapons import load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.paths import ITEM_INFO, ITEMS_DIR, WEAPON_SHIELD_CLASSES

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"


@pytest.fixture(scope="module")
def catalog() -> ItemCatalog:
    return load_item_catalog(ITEM_INFO)


@pytest.fixture(scope="module")
def talismans(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_talismans(catalog)


def test_shortlist_holds_41_distinct_names() -> None:
    assert len(SHORTLIST) == 41
    assert len(set(SHORTLIST)) == 41


def test_rows_are_exactly_the_shortlist(talismans: tuple[Item, ...]) -> None:
    assert [row.name for row in talismans] == list(SHORTLIST)
    assert {row.category for row in talismans} == {"talisman"}
    assert len({row.id for row in talismans}) == 41


def test_shortlist_rows_hold_no_stray_field(talismans: tuple[Item, ...]) -> None:
    for row in talismans:
        assert row.subcategory is None
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


def test_json_talismans_are_all_known_to_the_mod_but_one(catalog: ItemCatalog) -> None:
    known = {name.lower() for name in catalog.names["accessory"].values()}
    records = load_document(ITEMS_DIR, "talismans").records

    assert {str(r["name"]) for r in records if str(r["name"]).lower() not in known} == {
        "Entwining Umbilical Cord"
    }


def test_pools_so_far_join_without_a_collision(
    catalog: ItemCatalog, talismans: tuple[Item, ...]
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    weapons = build_weapons(
        catalog,
        variants,
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHIELD_CLASSES),
    )
    armor = build_armor(catalog, variants)

    table = build_item_table((*weapons, *armor, *talismans))

    assert len(table) == 1159
    assert [row.id for row in table] == [row.id for row in (*weapons, *armor, *talismans)]


def test_shortlist_name_the_mod_does_not_hold_stops_the_build() -> None:
    catalog = ItemCatalog(
        names={"accessory": {1: "Other"}},
        counts={},
        unique_counts={},
        groups={},
        locations=(),
    )

    with pytest.raises(BuildError, match="unknown item"):
        build_talismans(catalog)
