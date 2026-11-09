"""Tests for the vocabulary and the selector dialect (`prd.md` §6.3, §8.4)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import cast

import pytest

from eldenroll.build.items import new_item, none_item
from eldenroll.errors import BuildError
from eldenroll.model.item import Category
from eldenroll.model.selector import SELECTOR_KINDS, Selector, SelectorKind
from eldenroll.model.vocabulary import (
    ASH_SLOTS,
    CATEGORIES,
    CHARACTER_CLASSES,
    MELEE,
    SHIELD,
    SLOTS,
    SUBCATEGORIES,
)
from eldenroll.normalize.selectors import new_selector
from eldenroll.validate.placement import PlacementData, load_placement_data
from eldenroll.validate.selectors import (
    known_ids,
    resolve_items,
    validate_modifier_target,
    validate_selectors,
)
from eldenroll.validate.subcategories import validate_subcategories

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def data() -> PlacementData:
    return load_placement_data(ROOT)


def test_vocabulary_counts() -> None:
    assert len(CHARACTER_CLASSES) == 8
    assert len(SLOTS) == 10
    assert set(SLOTS) > ASH_SLOTS
    assert len(CATEGORIES) == 10


def test_every_item_uses_the_vocabulary(data: PlacementData) -> None:
    validate_subcategories(data.table)


def test_every_category_and_subcategory_holds_an_item(data: PlacementData) -> None:
    assert {row.category for row in data.table} == CATEGORIES
    used = {row.subcategory for row in data.table if row.subcategory is not None}
    assert used == set().union(*SUBCATEGORIES.values())


def test_an_unknown_category_fails() -> None:
    row = replace(new_item("A", "talisman"), category=cast(Category, "relic"))
    with pytest.raises(BuildError, match="bad category or subcategory on: A"):
        validate_subcategories([row])


@pytest.mark.parametrize("ids", [None, [], ()])
def test_no_ids_means_every_option(ids: list[str] | tuple[str, ...] | None) -> None:
    assert new_selector("category", ids) == Selector("category", None)


def test_ids_are_sorted_and_unique() -> None:
    assert new_selector("item", ["b", "a", "b"]).ids == ("a", "b")


def test_a_group_expands_to_its_classes() -> None:
    selector = new_selector("subcategory", ["melee", "thrusting_shield"])
    assert selector.ids == tuple(sorted(MELEE | {"thrusting_shield"}))
    assert new_selector("subcategory", ["shield"]).ids == tuple(sorted(SHIELD))


def test_paired_and_unpaired_split_melee() -> None:
    assert new_selector("subcategory", ["paired", "unpaired"]).ids == tuple(sorted(MELEE))
    assert len(new_selector("subcategory", ["unpaired"]).ids or ()) == 23


def test_a_group_name_expands_only_as_a_subcategory() -> None:
    assert new_selector("item", ["shield"]).ids == ("shield",)


def test_an_unknown_kind_fails() -> None:
    with pytest.raises(BuildError, match="unknown selector kind: weapon"):
        new_selector("weapon", ["katana"])


@pytest.mark.parametrize(
    ("kind", "good"),
    [
        ("item", "bloodhounds_fang"),
        ("item", "none"),
        ("subcategory", "katana"),
        ("category", "none"),
        ("rule", "parry_only"),
        ("armor_set", "raptors_set"),
        ("slot", "talisman_1"),
    ],
)
def test_known_ids_pass_and_unknown_fail(
    data: PlacementData, kind: SelectorKind, good: str
) -> None:
    known = known_ids(data.table, data.armor_sets, data.bosses, ["parry_only"])
    validate_selectors([Selector(kind, (good,))], known)
    with pytest.raises(BuildError, match=f"selector matches nothing: {kind}: typo"):
        validate_selectors([Selector(kind, (good, "typo"))], known)


def test_every_kind_has_options(data: PlacementData) -> None:
    known = known_ids(data.table, data.armor_sets, data.bosses, ["parry_only"])
    validate_selectors([Selector(kind, None) for kind in SELECTOR_KINDS], known)


def test_every_option_of_an_empty_kind_fails(data: PlacementData) -> None:
    known = known_ids(data.table, data.armor_sets, data.bosses, [])
    with pytest.raises(BuildError, match="selector matches nothing: rule: every option"):
        validate_selectors([Selector("rule", None)], known)


def test_a_boss_selector_is_known_but_no_target(data: PlacementData) -> None:
    boss = Selector("boss", (data.bosses[0].id,))
    validate_selectors([boss], known_ids(data.table, data.armor_sets, data.bosses, []))
    with pytest.raises(BuildError, match="a boss cannot be a modifier target"):
        validate_modifier_target(boss)
    validate_modifier_target(Selector("item", ("none",)))


@pytest.mark.parametrize(
    ("selector", "expected"),
    [
        (Selector("item", ("a",)), {"a"}),
        (Selector("item", None), {"a", "b", "c"}),
        (Selector("subcategory", ("katana",)), {"a"}),
        (Selector("subcategory", None), {"a", "c"}),
        (Selector("category", ("talisman",)), {"b"}),
        (Selector("category", None), {"a", "b", "c"}),
        (Selector("category", ("none",)), {"none"}),
        (Selector("item", ("none",)), {"none"}),
        (Selector("rule", None), set[str]()),
    ],
)
def test_resolve_items(selector: Selector, expected: set[str]) -> None:
    rows = [
        replace(new_item("A", "weapon", subcategory="katana"), id="a"),
        replace(new_item("B", "talisman"), id="b"),
        replace(new_item("C", "armor", subcategory="head"), id="c"),
        none_item(),
    ]
    assert {row.id for row in resolve_items([selector], rows)} == expected


def test_resolve_items_keeps_one_row_per_item() -> None:
    row = new_item("A", "talisman")
    selectors = [Selector("category", ("talisman",)), Selector("item", (row.id,))]
    assert resolve_items(selectors, [row]) == (row,)
