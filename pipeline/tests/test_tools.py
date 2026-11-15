"""Tests for the tool rows against the real sources (`data/README.md#Scope`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.tools import TOOLS, TRANSFORMS, build_tools, sheet_base_names
from eldenroll.errors import BuildError
from eldenroll.loaders.consumables import load_consumable_categories
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.paths import TOOL_CONSUMABLE_CLASSES
from eldenroll.validate.gaps import GapSources


def _sheet(*names: str) -> CsvTable:
    return CsvTable(
        path=Path("sheet.csv"),
        header_row=0,
        header=("Name",),
        rows=tuple((name,) for name in names),
    )


def _catalog(*names: str) -> ItemCatalog:
    return ItemCatalog(
        names={"goods": dict(enumerate(names))},
        counts={},
        unique_counts={},
        groups={},
        locations=(),
    )


@pytest.fixture(scope="module")
def tools(sources: GapSources) -> tuple[Item, ...]:
    return build_tools(sources.catalog, load_consumable_categories(TOOL_CONSUMABLE_CLASSES))


def test_rows_are_exactly_the_whitelist_and_the_transforms(tools: tuple[Item, ...]) -> None:
    assert [row.name for row in tools] == [*TOOLS, *TRANSFORMS]
    assert len({row.id for row in tools}) == len(tools)
    assert {row.category for row in tools} == {"tool"}


def test_folding_keeps_first_seen_order_and_other_names() -> None:
    assert sheet_base_names(_sheet("Pot", "Bairn 1", "Bairn 2", "Pot 3")) == (
        "Pot",
        "Bairn",
        "Pot 3",
    )


def test_tool_missing_from_the_sheet_stops_the_build() -> None:
    with pytest.raises(BuildError, match="unknown item"):
        build_tools(_catalog(*TOOLS, *TRANSFORMS), _sheet(*TOOLS[1:]))


def test_tool_missing_from_the_mod_stops_the_build() -> None:
    with pytest.raises(BuildError, match="unknown item"):
        build_tools(_catalog(*TOOLS[1:], *TRANSFORMS), _sheet(*TOOLS))


def test_transform_missing_from_the_mod_stops_the_build() -> None:
    with pytest.raises(BuildError, match="Rock Heart"):
        build_tools(_catalog(*TOOLS, "Lamenter's Mask", "Priestess Heart"), _sheet(*TOOLS))


def test_transform_needs_no_sheet_row() -> None:
    rows = build_tools(_catalog(*TOOLS, *TRANSFORMS), _sheet(*TOOLS))

    assert [row.name for row in rows][-3:] == list(TRANSFORMS)
