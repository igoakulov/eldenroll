"""Tests for the item table: ids, names and row shape (`data.md` §2, §8.3, §11)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from eldenrando.build.items import build_item_table, new_item, none_item
from eldenrando.errors import BuildError
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.normalize.slug import slugify
from eldenrando.paths import ITEM_INFO

ROOT = Path(__file__).resolve().parents[2]

SECTION_2_FIELDS = [
    "id",
    "name",
    "category",
    "subcategory",
    "infusable",
    "str_bonus_2h",
    "alias",
    "image",
    "str",
    "dex",
    "int",
    "fth",
    "arc",
]


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


def test_every_catalog_name_has_a_clean_slug() -> None:
    names = load_item_catalog(ITEM_INFO).names

    slugs = [slugify(name) for entries in names.values() for name in entries.values()]

    assert len(slugs) == 2448
    assert all(re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)*", slug) for slug in slugs)


def test_row_holds_exactly_the_documented_fields_in_order() -> None:
    row = new_item(
        "Bloodhound's Fang",
        "weapon",
        subcategory="curved_greatsword",
        infusable=False,
        str_bonus_2h=True,
        image="weapons/bloodhounds_fang.png",
        req_str=18,
        req_dex=17,
    ).to_row()

    assert list(row) == SECTION_2_FIELDS
    assert row["id"] == "bloodhounds_fang"
    assert (row["str"], row["dex"], row["int"], row["fth"], row["arc"]) == (18, 17, 0, 0, 0)


def test_new_item_defaults_are_the_non_weapon_row() -> None:
    row = new_item("Greatshield Talisman", "talisman").to_row()

    assert row == {
        "id": "greatshield_talisman",
        "name": "Greatshield Talisman",
        "category": "talisman",
        "subcategory": None,
        "infusable": None,
        "str_bonus_2h": None,
        "alias": None,
        "image": None,
        "str": 0,
        "dex": 0,
        "int": 0,
        "fth": 0,
        "arc": 0,
    }


def test_name_without_a_slug_stops_the_build() -> None:
    with pytest.raises(BuildError, match="has no slug"):
        new_item("???", "tool")


def test_table_keeps_input_order_and_unique_ids() -> None:
    rows = build_item_table([new_item("Parry", "ash"), new_item("Heal Pot", "consumable")])

    assert [row.id for row in rows] == ["parry", "heal_pot"]


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


def test_source_suffixes_leave_the_slugs_unique() -> None:
    rows = build_item_table(
        [new_item("Beast Claw", "weapon"), new_item("Beast Claw (Incantation)", "incantation")]
    )

    assert [row.id for row in rows] == ["beast_claw", "beast_claw_incantation"]


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


def test_the_none_row_is_allowed() -> None:
    rows = build_item_table([none_item()])

    assert rows[0].id == "none"


def test_the_none_row_holds_exactly_the_documented_values() -> None:
    assert none_item().to_row() == {
        "id": "none",
        "name": "none",
        "category": "none",
        "subcategory": None,
        "infusable": None,
        "str_bonus_2h": False,
        "alias": None,
        "image": None,
        "str": 0,
        "dex": 0,
        "int": 0,
        "fth": 0,
        "arc": 0,
    }


def test_a_second_none_row_stops_the_build() -> None:
    with pytest.raises(BuildError, match="2 none rows"):
        build_item_table([none_item(), new_item("empty", "none")])
