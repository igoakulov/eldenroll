"""Tests for the gap checks: what they find in the sources, and that every gap has its override
(`data/overrides/README.md#Gaps`)."""

from __future__ import annotations

from typing import cast

import pytest

from eldenroll.model.gap import Gap
from eldenroll.model.item import Item
from eldenroll.validate.gaps import (
    GapSources,
    find_gaps,
    item_origin,
    requirement_gaps,
    uncovered,
)

GAP = Gap("requirements", "Pata", "no stat record")


@pytest.fixture(scope="module")
def found(sources: GapSources) -> tuple[Gap, ...]:
    return find_gaps(sources)


def _item(sources: GapSources, name: str) -> Item:
    return next(item for item in sources.table if item.name == name)


@pytest.mark.parametrize(
    ("name", "origin"),
    [
        ("Bandit's Curved Sword", "base"),
        ("Hefty Scimitar", "tarnished"),
        ("Pata", "dlc"),
    ],
)
def test_item_origin(sources: GapSources, name: str, origin: str) -> None:
    assert item_origin(_item(sources, name), sources.catalog, sources.variants) == origin


def test_every_weapon_in_the_base_game_files_reads_as_base_or_tarnished(
    sources: GapSources,
) -> None:
    names: set[str] = set()
    for document in ("weapons", "shields"):
        for record in sources.requirement_records[document]:
            variant = sources.variants.get(cast("str", record["id"]))
            name = cast("str", record["name"]) if variant is None else variant.canonical_name
            names.add(name.casefold())
    origins = {
        item.name: item_origin(item, sources.catalog, sources.variants)
        for item in sources.table
        if item.category in ("weapon", "shield") and item.name.casefold() in names
    }
    assert [name for name, origin in origins.items() if origin == "dlc"] == []


@pytest.mark.parametrize(
    "name",
    [
        "Siluria's Tree",
        "Oracle Bubbles",
    ],
)
def test_broken_stat_record_is_a_gap(found: tuple[Gap, ...], name: str) -> None:
    assert ("requirements", name) in {gap.key for gap in found}


def test_base_game_weapon_off_the_sheet_is_not_asked_about(found: tuple[Gap, ...]) -> None:
    asked = {gap.item for gap in found if gap.area == "holds_ash"}
    assert not asked & {"Bandit's Curved Sword", "Inseparable Sword", "Dragon Halberd"}


def test_every_enia_remembrance_is_a_gap(found: tuple[Gap, ...]) -> None:
    asked = {gap.item for gap in found if gap.area == "remembrance_boss"}
    assert {"Remembrance of the Omen King", "Elden Remembrance"} <= asked


def test_stat_records_of_one_item_may_repeat_if_they_agree(sources: GapSources) -> None:
    assert ("requirements", "Ekzykes's Decay") not in {gap.key for gap in requirement_gaps(sources)}


def test_gap_without_an_override_is_reported() -> None:
    assert uncovered([GAP], {}) == (
        "requirements 'Pata': no stat record; answer it in requirements.csv",
    )
    assert uncovered([GAP], {"requirements": frozenset({"Pata"})}) == ()
