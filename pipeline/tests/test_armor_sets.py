"""Tests for the armor set table against the real sources (`data/README.md#Armor`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.armor_sets import build_armor_sets
from eldenroll.build.items import new_item
from eldenroll.errors import BuildError
from eldenroll.loaders.armor_sets import load_armor_sets
from eldenroll.loaders.schema import LoaderError
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
SETS = ROOT / "data" / "overrides" / "armor_sets.csv"


@pytest.fixture(scope="module")
def sets() -> dict[str, tuple[str, ...]]:
    return load_armor_sets(SETS)


def test_the_docs_examples_link_as_written(
    sources: GapSources, sets: dict[str, tuple[str, ...]]
) -> None:
    linked = {row.id: row for row in build_armor_sets(sets, sources.table)}
    assert linked["raptors_set"].pieces == (
        "skeletal_mask",
        "raptors_black_feathers",
        "bandit_manchettes",
        "bandit_boots",
    )
    assert "gravebirds_blackquill_armor" in linked["gravebird_set"].pieces
    assert {"dancers_set", "highland_warrior", "highland_warrior_gloried"} <= set(linked)


def test_a_piece_may_belong_to_several_sets_and_a_set_to_no_pieces() -> None:
    table = (new_item("Hat", "armor", subcategory="head"),)
    linked = build_armor_sets({"A Set": ("Hat",), "B Set": ("Hat",), "Bare Set": ()}, table)
    assert [(row.id, row.pieces) for row in linked] == [
        ("a_set", ("hat",)),
        ("b_set", ("hat",)),
        ("bare_set", ()),
    ]


def test_pieces_are_stored_in_slot_order() -> None:
    table = (
        new_item("Boots", "armor", subcategory="legs"),
        new_item("Hat", "armor", subcategory="head"),
    )
    assert build_armor_sets({"A": ("Boots", "Hat")}, table)[0].pieces == ("hat", "boots")


@pytest.mark.parametrize(
    ("sets", "message"),
    [
        ({"A": ("Nothing",)}, "names no armor piece called: Nothing"),
        ({"A": ("Spear",)}, "names no armor piece called: Spear"),
        ({"A": ("Hat", "Crown")}, "in slot head"),
        ({"A Set": (), "A-Set": ()}, "share the id"),
    ],
)
def test_a_bad_link_stops_the_build(sets: dict[str, tuple[str, ...]], message: str) -> None:
    table = (
        new_item("Hat", "armor", subcategory="head"),
        new_item("Crown", "armor", subcategory="head"),
        new_item("Spear", "weapon", subcategory="spear"),
    )
    with pytest.raises(BuildError, match=message):
        build_armor_sets(sets, table)


def test_a_set_may_hold_no_pieces(tmp_path: Path) -> None:
    path = tmp_path / "armor_sets.csv"
    path.write_text("set,piece,reason\nBare,,why\n", encoding="utf-8")
    assert load_armor_sets(path) == {"Bare": ()}


@pytest.mark.parametrize(
    ("lines", "message"),
    [
        ("A,B,", "empty reason"),
        (",B,why", "empty set"),
        ("A,B,why\nA,B,why", "repeats"),
        ("A,,why\nA,B,why", "empty piece and another row"),
        ("A,B,why\nA,,why", "empty piece and another row"),
        ("\n".join(f"A,{piece},why" for piece in "BCDEF"), "more than 4"),
    ],
)
def test_bad_row_stops_the_load(tmp_path: Path, lines: str, message: str) -> None:
    path = tmp_path / "armor_sets.csv"
    path.write_text(f"set,piece,reason\n{lines}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_armor_sets(path)
