"""Tests for the armor set table against the real sources (`data.md` §4.3)."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from eldenrando.build.armor_sets import build_armor_sets
from eldenrando.build.items import new_item
from eldenrando.errors import BuildError
from eldenrando.loaders.armor_sets import load_armor_sets
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.vocabulary import ARMOR_SLOTS
from eldenrando.paths import ARMOR_SETS_PAGE
from eldenrando.validate.gaps import load_sources

ROOT = Path(__file__).resolve().parents[2]
SETS = ROOT / "data" / "overrides" / "armor_sets.csv"

# What the table leaves out of the page's sets: the owner's variant picks (tasklist O48).
LEFT_OUT = {
    "Raya Lucaria Set": {
        "Karolos Glintstone Crown",
        "Olivinus Glintstone Crown",
        "Witch's Glintstone Crown",
    },
    "Gravebird Set": {"Gravebird Armor"},
    "Commoner's Set": {"Commoner's Garb"},
    "Guardian Set": {"Guardian Garb (Full Bloom)"},
    "Hoslow's Set": {"Diallos's Mask"},
    "Noble's Traveling Set": {"Crimson Hood"},
    "Preceptor's Set": {"Mask of Confidence"},
    "Mushroom Set": {"Mushroom Crown"},
    # The altered form of High Priest Robe, so not a piece (data.md 4.3).
    "High Priest Set": {"Finger Robe"},
}
HIGHLAND = {
    "Highland Warrior": {
        "Leather Crown",
        "Highland Attire",
        "Leather Arm Wraps",
        "Leather Leg Wraps",
    },
    "Highland Warrior (Gloried)": {
        "Leather Headband",
        "Gloried Attire",
        "Leather Arm Wraps",
        "Leather Leg Wraps",
    },
}


# Sets the page lacks, named by the owner (tasklist O50).
# The page has one set for each; the game can't alter these chests back, so each look is a set.
SPLIT = {
    "Banished Knight Set": {
        "Banished Knight Helm",
        "Banished Knight Armor (Altered)",
        "Banished Knight Gauntlets",
        "Banished Knight Greaves",
    },
    "Banished Knight Set (Caped)": {
        "Banished Knight Helm (Altered)",
        "Banished Knight Armor",
        "Banished Knight Gauntlets",
        "Banished Knight Greaves",
    },
    "Fire Prelate Set": {
        "Fire Prelate Helm",
        "Fire Prelate Armor",
        "Fire Prelate Gauntlets",
        "Fire Prelate Greaves",
    },
    "Fire Prelate Set (Altered)": {
        "Fire Prelate Helm",
        "Fire Prelate Armor (Altered)",
        "Fire Prelate Gauntlets",
        "Fire Prelate Greaves",
    },
}
OFF_PAGE = {
    "Golden Order Set": {
        "Broken Gold Mask",
        "Gold Tattoo (Chest)",
        "Gold Tattoo (Arm)",
        "Gold Tattoo (Leg)",
    },
    "Leontiel's Set": {
        "Leontiel's Hat",
        "Leontiel's Armor",
        "Leontiel's Leather Gloves",
        "Leontiel's Boots",
    },
}


# The owner's changes to the page's sets (tasklist 2.6.3): Blue Dancer Charm keeps these empty slots
# empty, and the Traveler's Set gains White Mask and a name for it.
EMPTIED = {
    "Bloodsoaked Set": {"None (Legs)"},
    "Festive Set": {"None (Arms)", "None (Legs)"},
    "Blue Festive Set": {"None (Arms)", "None (Legs)"},
}
RENAMED = {"Traveler's Set": ("Traveling Surgeon Set", {"White Mask"})}


def _page_sets() -> dict[str, set[str]]:
    """Return the page's sets, with `(Altered)` removed and `Chain Gauntlets` under its name."""
    out: dict[str, set[str]] = {}
    for line in ARMOR_SETS_PAGE.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            break
        name, _, pieces = line.partition(": ")
        out[name] = {piece.strip().removesuffix(" (Altered)") for piece in pieces.split(" | ")}
    chain = out["Chain Set"]
    chain.remove("Chain Gauntlets")
    chain.add("Gauntlets")
    return out


@pytest.fixture(scope="module")
def sets() -> dict[str, tuple[str, ...]]:
    return load_armor_sets(SETS)


def test_every_set_of_the_page_has_its_pieces(sets: dict[str, tuple[str, ...]]) -> None:
    expected = {
        name: pieces - LEFT_OUT.get(name, set()) | EMPTIED.get(name, set())
        for name, pieces in _page_sets().items()
    }
    del expected["Highland Warrior Set"]
    for old, (new, added) in RENAMED.items():
        expected[new] = expected.pop(old) | added
    expected |= HIGHLAND | SPLIT | OFF_PAGE
    assert {name: set(sets.get(name, ())) for name in expected} == expected


def test_the_highland_warrior_set_is_split_in_two(sets: dict[str, tuple[str, ...]]) -> None:
    assert len(sets) == 183
    assert {name: set(sets[name]) for name in HIGHLAND} == HIGHLAND


def test_every_piece_is_in_the_pool_and_a_set_holds_one_per_slot(
    sets: dict[str, tuple[str, ...]],
) -> None:
    slots = {
        row.name: row.subcategory for row in load_sources(ROOT).table if row.category == "armor"
    }
    for name, pieces in sets.items():
        assert set(pieces) <= set(slots), name
        assert max(Counter(slots[piece] for piece in pieces).values(), default=0) <= 1, name


def test_every_piece_links_to_an_armor_row(sets: dict[str, tuple[str, ...]]) -> None:
    table = load_sources(ROOT).table
    linked = build_armor_sets(sets, table)
    armor = {row.id: row for row in table if row.category == "armor"}
    assert len(linked) == len(sets)
    for row in linked:
        assert {armor[piece].name for piece in row.pieces} == set(sets[row.name])
        held = [armor[piece].subcategory for piece in row.pieces]
        assert held == [slot for slot in ARMOR_SLOTS if slot in held]


def test_the_docs_examples_link_as_written(sets: dict[str, tuple[str, ...]]) -> None:
    linked = {row.id: row for row in build_armor_sets(sets, load_sources(ROOT).table)}
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
