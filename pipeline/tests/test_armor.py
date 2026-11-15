"""Tests for the armor rows against the real sources
(`data/README.md#Armor`, `data/sources/README.md#Matching names`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.armor import build_armor
from eldenroll.errors import BuildError
from eldenroll.loaders.json_source import load_document
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import CatalogGroup, ItemCatalog
from eldenroll.model.name_variant import NameVariant
from eldenroll.paths import ARMOR_DIR
from eldenroll.validate.gaps import GapSources

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
def catalog(sources: GapSources) -> ItemCatalog:
    return sources.catalog


@pytest.fixture(scope="module")
def armor(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_armor(catalog, load_name_variants(OVERRIDES / "name_variants.csv"))


@pytest.fixture(scope="module")
def names(armor: tuple[Item, ...]) -> set[str]:
    return {row.name for row in armor}


def test_no_name_carries_altered(names: set[str]) -> None:
    assert not [name for name in names if "altered" in name.lower()]


def test_altered_piece_survives_under_its_plain_name(names: set[str]) -> None:
    assert set(MERGED + RENAMED) <= names


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

    assert pieces
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


def test_piece_keeps_the_mods_name_not_another_sources(names: set[str]) -> None:
    assert {"Nox Bracelets", "Nox Greaves", "Gauntlets", "Champion Bracers"} <= names
    assert (
        not {"Nox Monk Bracelets", "Nox Monk Greaves", "Chain Gauntlets", "Champion Gauntlets"}
        & names
    )


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


def test_an_altered_piece_a_set_names_stays_its_own_row() -> None:
    rows = build_armor(_catalog({1: "Hood", 2: "Hood (Altered)"}), {}, {"Hood (Altered)"})

    assert [row.name for row in rows] == ["Hood", "Hood (Altered)"]


def test_altered_piece_with_no_plain_row_stops_the_build() -> None:
    with pytest.raises(BuildError, match="no unaltered row: Gown"):
        build_armor(_catalog({1: "Gown (Altered)"}), {})


def test_variant_for_another_record_stops_the_build() -> None:
    variant = NameVariant(source_id="1", source_name="Other", canonical_name="New")

    with pytest.raises(BuildError, match="expects 'Other', source says 'Hood'"):
        build_armor(_catalog({1: "Hood"}), {"1": variant})
