"""Tests for the talisman rows against the real sources (`data/README.md#Scope`)."""

from __future__ import annotations

import pytest

from eldenroll.build.talismans import SHORTLIST, build_talismans
from eldenroll.errors import BuildError
from eldenroll.loaders.json_source import load_document
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.paths import ITEMS_DIR
from eldenroll.validate.gaps import GapSources


@pytest.fixture(scope="module")
def catalog(sources: GapSources) -> ItemCatalog:
    return sources.catalog


@pytest.fixture(scope="module")
def talismans(catalog: ItemCatalog) -> tuple[Item, ...]:
    return build_talismans(catalog)


def test_rows_are_exactly_the_shortlist(talismans: tuple[Item, ...]) -> None:
    assert [row.name for row in talismans] == list(SHORTLIST)
    assert {row.category for row in talismans} == {"talisman"}
    assert len({row.id for row in talismans}) == len(talismans)


def test_json_talismans_are_all_known_to_the_mod_but_one(catalog: ItemCatalog) -> None:
    known = {name.lower() for name in catalog.names["accessory"].values()}
    records = load_document(ITEMS_DIR, "talismans").records

    assert {str(r["name"]) for r in records if str(r["name"]).lower() not in known} == {
        "Entwining Umbilical Cord"
    }


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
