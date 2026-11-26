"""Tests for the item table: ids, names and row shape (`data/README.md#Rows`)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from eldenroll.build.items import build_item_table, new_item, none_item
from eldenroll.errors import BuildError
from eldenroll.loaders.odds import load_odds
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.armor_set import ArmorSet
from eldenroll.normalize.odds import assign_armor_set_odds, assign_item_odds
from eldenroll.normalize.slug import slugify
from eldenroll.validate.gaps import GapSources


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Bloodhound's Fang", "bloodhounds_fang"),
        ("Swordhand of Night Jolán", "swordhand_of_night_jolan"),
        ("Thops's Barrier", "thopss_barrier"),
        ("Beast Claw (Incantation)", "beast_claw_incantation"),
        ("Flame, Grant Me Strength", "flame_grant_me_strength"),
        ("Serpent-Hunter", "serpent_hunter"),
        ("Aspects of the Crucible: Breath", "aspects_of_the_crucible_breath"),
    ],
)
def test_slug_of_a_name(name: str, slug: str) -> None:
    assert slugify(name) == slug


def test_every_catalog_name_has_a_clean_slug(sources: GapSources) -> None:
    names = sources.catalog.names

    slugs = [slugify(name) for entries in names.values() for name in entries.values()]

    assert all(re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)*", slug) for slug in slugs)


def test_name_without_a_slug_stops_the_build() -> None:
    with pytest.raises(BuildError, match="has no slug"):
        new_item("???", "tool")


def test_every_item_on_a_colliding_slug_takes_its_category() -> None:
    rows = build_item_table(
        [
            new_item("Glintstone Pebble", "ash"),
            new_item("Glintstone Pebble", "sorcery"),
            new_item("Carian Greatsword", "ash"),
            new_item("Carian Greatsword", "sorcery"),
            new_item("Parry", "ash"),
        ]
    )

    assert [row.id for row in rows] == [
        "glintstone_pebble_ash",
        "glintstone_pebble_sorcery",
        "carian_greatsword_ash",
        "carian_greatsword_sorcery",
        "parry",
    ]
    assert [row.name for row in rows][:2] == ["Glintstone Pebble", "Glintstone Pebble"]


def test_same_name_in_one_category_stops_the_build() -> None:
    with pytest.raises(BuildError, match="repeats: ash: Parry"):
        build_item_table([new_item("Parry", "ash"), new_item("Parry", "ash")])


def test_same_slug_in_one_category_stops_the_build() -> None:
    with pytest.raises(BuildError, match="repeats: tool: omen_bairn"):
        build_item_table([new_item("Omen Bairn", "tool"), new_item("Omen-Bairn", "tool")])


def test_suffixed_id_colliding_with_another_item_stops_the_build() -> None:
    with pytest.raises(BuildError, match="repeats: parry_ash"):
        build_item_table(
            [
                new_item("Parry", "ash"),
                new_item("Parry", "sorcery"),
                new_item("Parry Ash", "tool"),
            ]
        )


@pytest.mark.parametrize(
    "name",
    [
        "Lamenter's Mask - Attack",
        "[ERROR]Rya's Necklace",
        "?ITEM? (Goods:125)",
        "Glowstone on an unused ESD",
        "Fia's Robe (Altered)",
        "any",
        "Any catalyst",
    ],
)
def test_excluded_name_stops_the_build(name: str) -> None:
    with pytest.raises(BuildError, match="excluded name"):
        build_item_table([new_item("Parry", "ash"), new_item(name, "tool")])


def test_a_second_none_row_stops_the_build() -> None:
    with pytest.raises(BuildError, match="2 none rows"):
        build_item_table([none_item(), new_item("empty", "none")])


def test_odds_overrides_replace_only_the_named_items() -> None:
    rows = (new_item("Charm", "talisman"), new_item("Mask", "tool"))

    set_rows = assign_item_odds(rows, {"mask": 0})

    assert [row.odds for row in set_rows] == [1, 0]


def test_an_odds_override_for_no_item_stops_the_build() -> None:
    with pytest.raises(BuildError, match="item_odds names no item: ghost"):
        assign_item_odds((new_item("Hat", "armor"),), {"ghost": 0})


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("mask,-1,why\n", "has odds"),
        ("mask,many,why\n", "has odds"),
        ("mask,,why\n", "empty odds"),
        ("mask,0,\n", "empty reason"),
        ("mask,0,why\nmask,1,why\n", "duplicate item"),
    ],
)
def test_a_bad_odds_row_is_a_loader_error(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "item_odds.csv"
    path.write_text(f"item,odds,reason\n{body}", encoding="utf-8")

    with pytest.raises(LoaderError, match=message):
        load_odds(path, "item")


def test_an_armor_piece_cannot_take_odds_because_only_its_set_rolls() -> None:
    with pytest.raises(BuildError, match="armor pieces roll through their set: hat"):
        assign_item_odds((new_item("Hat", "armor", subcategory="head"),), {"hat": 2})


def test_armor_set_odds_replace_only_the_named_sets() -> None:
    sets = (ArmorSet("a_set", "A Set", ()), ArmorSet("b_set", "B Set", ()))

    assert [row.odds for row in assign_armor_set_odds(sets, {"b_set": 3})] == [1, 3]


def test_an_odds_row_for_no_armor_set_stops_the_build() -> None:
    with pytest.raises(BuildError, match="armor_set_odds names no set: ghost"):
        assign_armor_set_odds((ArmorSet("a_set", "A Set", ()),), {"ghost": 0})
