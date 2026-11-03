"""Tests for the armor rows against the real sources (`data.md` §4.3, §8.4)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.armor import build_armor
from eldenrando.build.items import build_item_table
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.weapons import load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import CatalogGroup, ItemCatalog
from eldenrando.model.name_variant import NameVariant
from eldenrando.paths import ARMOR_DIR, ITEM_INFO, WEAPON_SHIELD_CLASSES

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

MERGED = [
    "Banished Knight Helm",
    "Banished Knight Armor",
    "Fire Prelate Armor",
    "Aristocrat Garb",
    "Festive Garb",
    "Commoner's Headband",
]
RENAMED = ["War Surgeon Gown", "Beast Champion Armor", "Errant Sorcerer Robe"]
TARNISHED_GROUP = 16
NOT_OBTAINABLE = {
    "Brave's Battlewear",
    "Brave's Bracer",
    "Brave's Cord Circlet",
    "Brave's Leather Helm",
    "Brave's Legwraps",
    "Deathbed Smalls",
    "Golden Prosthetic",
    "Grass Hair Ornament",
    "Millicent's Gloves",
    "Ragged Armor",
    "Ragged Gloves",
    "Ragged Hat",
    "Ragged Loincloth",
}


def _catalog(names: dict[int, str]) -> ItemCatalog:
    group = CatalogGroup(
        name="protectors",
        items={"protector": tuple(names)},
        item_count=len(names),
        location_count=0,
        unique_count=0,
    )
    return ItemCatalog(
        names={"protector": names},
        counts={},
        unique_counts={},
        groups={"protectors": group},
        locations=(),
    )


@pytest.fixture(scope="module")
def catalog() -> ItemCatalog:
    return load_item_catalog(ITEM_INFO)


@pytest.fixture(scope="module")
def armor(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_armor(catalog, load_name_variants(OVERRIDES / "name_variants.csv"))


@pytest.fixture(scope="module")
def names(armor: tuple[Item, ...]) -> set[str]:
    return {row.name for row in armor}


def test_rows_names_and_slugs_are_all_631(armor: tuple[Item, ...]) -> None:
    assert len(armor) == 631
    assert len({row.name for row in armor}) == 631
    assert len({row.id for row in armor}) == 631
    assert {row.category for row in armor} == {"armor"}


def test_no_name_carries_altered(names: set[str]) -> None:
    assert not [name for name in names if "altered" in name.lower()]


@pytest.mark.parametrize("name", MERGED + RENAMED)
def test_altered_piece_survives_under_its_plain_name(names: set[str], name: str) -> None:
    assert name in names


def test_exactly_six_altered_pieces_merge(catalog: ItemCatalog) -> None:
    source = catalog.names["protector"].values()
    altered = {name.removesuffix(" (Altered)") for name in source if name.endswith(" (Altered)")}

    assert altered - set(source) == set(RENAMED)
    assert altered & set(source) == set(MERGED)


def test_pieces_in_the_mods_tarnished_group_stay_in_the_pool(
    catalog: ItemCatalog, names: set[str]
) -> None:
    tarnished = catalog.groups["tarnished"].items["protector"]
    pieces = {catalog.names["protector"][item_id] for item_id in tarnished}

    assert len(pieces) == TARNISHED_GROUP
    assert pieces <= names


def test_every_json_piece_maps_to_the_pool_or_is_not_in_the_game(names: set[str]) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pool = {name.lower() for name in names}
    unmatched: set[str] = set()
    for record in load_document(ARMOR_DIR, "armors").records:
        variant = variants.get(str(record["id"]))
        name = variant.canonical_name if variant else str(record["name"])
        if name.lower().removesuffix(" (altered)") not in pool:
            unmatched.add(name.removesuffix(" (altered)"))

    assert unmatched == NOT_OBTAINABLE


def test_pieces_not_in_the_game_never_become_rows(names: set[str]) -> None:
    assert not NOT_OBTAINABLE & names


@pytest.mark.parametrize("name", ["Nox Bracelets", "Nox Greaves", "Gauntlets", "Champion Bracers"])
def test_piece_keeps_the_mods_name(names: set[str], name: str) -> None:
    assert name in names


@pytest.mark.parametrize(
    "name",
    ["Nox Monk Bracelets", "Nox Monk Greaves", "Chain Gauntlets", "Champion Gauntlets"],
)
def test_other_sources_spelling_is_not_a_row(names: set[str], name: str) -> None:
    assert name not in names


def test_later_steps_own_the_remaining_fields(armor: tuple[Item, ...]) -> None:
    for row in armor:
        assert row.subcategory is None
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert row.image is None
        assert row.alias is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


def test_armor_and_weapons_join_without_a_collision(
    catalog: ItemCatalog, armor: tuple[Item, ...]
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    weapons = build_weapons(
        catalog,
        variants,
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHIELD_CLASSES),
    )

    table = build_item_table((*weapons, *armor))

    assert len(table) == 1118
    assert [row.id for row in table] == [row.id for row in (*weapons, *armor)]


def test_altered_piece_merges_into_its_plain_row() -> None:
    rows = build_armor(_catalog({1: "Hood", 2: "Hood (Altered)"}), {})

    assert [row.name for row in rows] == ["Hood"]


def test_merge_does_not_depend_on_group_order() -> None:
    rows = build_armor(_catalog({1: "Hood (Altered)", 2: "Hood"}), {})

    assert [row.name for row in rows] == ["Hood"]


def test_variant_renames_an_altered_only_piece() -> None:
    variant = NameVariant(source_id="1", source_name="Gown (Altered)", canonical_name="Gown")

    rows = build_armor(_catalog({1: "Gown (Altered)"}), {"1": variant})

    assert [row.name for row in rows] == ["Gown"]


def test_altered_piece_with_no_plain_row_stops_the_build() -> None:
    with pytest.raises(BuildError, match="no unaltered row: Gown"):
        build_armor(_catalog({1: "Gown (Altered)"}), {})


def test_variant_for_another_record_stops_the_build() -> None:
    variant = NameVariant(source_id="1", source_name="Other", canonical_name="New")

    with pytest.raises(BuildError, match="expects 'Other', source says 'Hood'"):
        build_armor(_catalog({1: "Hood"}), {"1": variant})
