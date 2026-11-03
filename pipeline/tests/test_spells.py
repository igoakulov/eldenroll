"""Tests for the spell rows against the real sources (`data.md` §4.6, §4.7)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.armor import build_armor
from eldenrando.build.ashes import build_ashes
from eldenrando.build.items import build_item_table
from eldenrando.build.spells import (
    EXCLUDED_INCANTATIONS,
    EXCLUDED_SORCERIES,
    build_incantations,
    build_sorceries,
)
from eldenrando.build.talismans import build_talismans
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.ash_sources import load_ash_sources
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.weapons import load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import CatalogGroup, ItemCatalog
from eldenrando.paths import ITEM_INFO, ITEMS_DIR, WEAPON_SHIELD_CLASSES

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"


def _catalog(names: dict[int, str]) -> ItemCatalog:
    group = CatalogGroup(
        name="sorceries",
        items={"goods": tuple(names)},
        item_count=len(names),
        location_count=0,
        unique_count=0,
    )
    return ItemCatalog(
        names={"goods": names},
        counts={},
        unique_counts={},
        groups={"sorceries": group},
        locations=(),
    )


@pytest.fixture(scope="module")
def catalog() -> ItemCatalog:
    return load_item_catalog(ITEM_INFO)


@pytest.fixture(scope="module")
def sorceries(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_sorceries(catalog, load_name_variants(OVERRIDES / "name_variants.csv"))


@pytest.fixture(scope="module")
def names(sorceries: tuple[Item, ...]) -> set[str]:
    return {row.name for row in sorceries}


@pytest.fixture(scope="module")
def incantations(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_incantations(catalog, load_name_variants(OVERRIDES / "name_variants.csv"))


@pytest.fixture(scope="module")
def incantation_names(incantations: tuple[Item, ...]) -> set[str]:
    return {row.name for row in incantations}


def test_exclusion_lists_hold_17_and_43_names() -> None:
    assert len(EXCLUDED_SORCERIES) == 17
    assert len(EXCLUDED_INCANTATIONS) == 43


def test_incantation_rows_names_and_slugs_are_all_86(incantations: tuple[Item, ...]) -> None:
    assert len(incantations) == 86
    assert len({row.name for row in incantations}) == 86
    assert len({row.id for row in incantations}) == 86
    assert {row.category for row in incantations} == {"incantation"}


@pytest.mark.parametrize("name", sorted(EXCLUDED_INCANTATIONS))
def test_incantation_exclusion_is_absent(incantation_names: set[str], name: str) -> None:
    assert name not in incantation_names


def test_every_json_incantation_maps_to_the_pool_or_is_excluded(
    incantation_names: set[str],
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pool = {name.lower() for name in incantation_names}
    unmatched: set[str] = set()
    for record in load_document(ITEMS_DIR, "incantations").records:
        variant = variants.get(str(record["id"]))
        name = variant.canonical_name if variant else str(record["name"])
        if name.lower() not in pool:
            unmatched.add(name)

    excluded = {name.lower() for name in EXCLUDED_INCANTATIONS}

    assert {name for name in unmatched if name.lower() not in excluded} == {"Golden Vow (spell)"}


def test_beast_claw_incantation_keeps_the_suffix_that_splits_it_from_the_weapon(
    incantations: tuple[Item, ...],
) -> None:
    by_name = {row.name: row.id for row in incantations}

    assert by_name["Beast Claw (Incantation)"] == "beast_claw_incantation"
    assert "Beast Claw" not in by_name


def test_rows_names_and_slugs_are_all_67(sorceries: tuple[Item, ...]) -> None:
    assert len(sorceries) == 67
    assert len({row.name for row in sorceries}) == 67
    assert len({row.id for row in sorceries}) == 67
    assert {row.category for row in sorceries} == {"sorcery"}


@pytest.mark.parametrize("name", sorted(EXCLUDED_SORCERIES))
def test_exclusion_is_absent(names: set[str], name: str) -> None:
    assert name not in names


def test_every_json_sorcery_maps_to_the_pool_or_is_excluded(names: set[str]) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pool = {name.lower() for name in names}
    unmatched: set[str] = set()
    for record in load_document(ITEMS_DIR, "sorceries").records:
        variant = variants.get(str(record["id"]))
        name = variant.canonical_name if variant else str(record["name"])
        if name.lower() not in pool:
            unmatched.add(name)

    assert unmatched - EXCLUDED_SORCERIES == {"Terra Magicus"}


def test_later_steps_own_the_remaining_fields(sorceries: tuple[Item, ...]) -> None:
    for row in sorceries:
        assert row.subcategory is None
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


def test_names_shared_with_ashes_take_a_category_suffix(
    catalog: ItemCatalog, sorceries: tuple[Item, ...], incantations: tuple[Item, ...]
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    weapons = build_weapons(
        catalog,
        variants,
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHIELD_CLASSES),
    )
    ashes = build_ashes(catalog, variants, load_ash_sources(OVERRIDES / "ash_sources.csv"))
    armor = build_armor(catalog, variants)
    rows = (*weapons, *armor, *build_talismans(catalog), *ashes, *sorceries, *incantations)

    table = build_item_table(rows)
    ids = {row.id for row in table}
    original = {row.id for row in rows}

    assert len(table) == 1423
    assert {variant.canonical_name for variant in variants.values()} <= {row.name for row in rows}
    assert original - ids == {"glintstone_pebble", "carian_greatsword", "glintblade_phalanx"}
    assert ids - original == {
        "glintstone_pebble_ash",
        "glintstone_pebble_sorcery",
        "carian_greatsword_ash",
        "carian_greatsword_sorcery",
        "glintblade_phalanx_ash",
        "glintblade_phalanx_sorcery",
    }


def test_exclusion_naming_no_sorcery_stops_the_build() -> None:
    with pytest.raises(BuildError, match="name no sorcery"):
        build_sorceries(_catalog({1: "Comet"}), {})


def test_incantation_exclusion_naming_no_incantation_stops_the_build() -> None:
    group = CatalogGroup(
        name="incantations",
        items={"goods": (1,)},
        item_count=1,
        location_count=0,
        unique_count=0,
    )
    catalog = ItemCatalog(
        names={"goods": {1: "Heal"}},
        counts={},
        unique_counts={},
        groups={"incantations": group},
        locations=(),
    )

    with pytest.raises(BuildError, match="name no incantation"):
        build_incantations(catalog, {})


def test_exclusions_are_removed() -> None:
    names = dict(enumerate(sorted(EXCLUDED_SORCERIES)))
    names[99] = "Comet"

    rows = build_sorceries(_catalog(names), {})

    assert [(row.id, row.category) for row in rows] == [("comet", "sorcery")]
