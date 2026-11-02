"""Tests for the tool rows against the real sources (`data.md` §4.8, §4.9)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.tools import TOOLS, TRANSFORMS, build_tools, sheet_base_names
from eldenrando.errors import BuildError
from eldenrando.loaders.consumables import load_consumable_categories
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "raw"
ITEMINFO = RAW / "pc_mod_data" / "iteminfo.txt"
SHEET = RAW / "csv" / "tools_consumables_categories.csv"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")


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
def tools() -> tuple[Item, ...]:
    return build_tools(load_item_catalog(ITEMINFO), load_consumable_categories(SHEET))


@needs_files
def test_rows_are_exactly_the_whitelist_and_the_transforms(tools: tuple[Item, ...]) -> None:
    assert [row.name for row in tools] == [*TOOLS, *TRANSFORMS]
    assert len({row.id for row in tools}) == 9
    assert {row.category for row in tools} == {"tool"}


def test_the_transforms_are_the_three_the_owner_named() -> None:
    assert set(TRANSFORMS) == {"Lamenter's Mask", "Rock Heart", "Priestess Heart"}


@needs_files
def test_tool_rows_hold_no_stray_field(tools: tuple[Item, ...]) -> None:
    for row in tools:
        assert row.subcategory is None
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


@needs_files
def test_sheet_folds_90_rows_into_88_names() -> None:
    sheet = load_consumable_categories(SHEET)
    names = sheet_base_names(sheet)

    assert sheet.row_count == 90
    assert len(names) == 88
    assert {"Omen Bairn", "Regal Omen Bairn"} <= set(names)
    assert not {"Omen Bairn 1", "Omen Bairn 2", "Regal Omen Bairn 1", "Regal Omen Bairn 2"} & set(
        names
    )


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
