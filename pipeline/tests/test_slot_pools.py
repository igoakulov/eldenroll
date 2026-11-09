"""Tests for the character classes and their slot pools against the real tables (`prd.md` §6)."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.slot_pools import build_slot_pools
from eldenroll.errors import BuildError
from eldenroll.loaders.character_classes import (
    SlotPoolRow,
    load_character_classes,
    load_slot_pools,
)
from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.character_class import SlotPool
from eldenroll.model.item import Item
from eldenroll.model.selector import Selector
from eldenroll.model.vocabulary import CATALYST, MELEE, RANGED, UNPAIRED
from eldenroll.normalize.selectors import new_selector
from eldenroll.validate.placement import PlacementData, load_placement_data
from eldenroll.validate.selectors import known_ids, resolve_items
from eldenroll.validate.slot_pools import validate_slot_pools

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
RULES = tuple(rule.id for rule in load_combat_rules(OVERRIDES / "combat_rules.csv"))


@pytest.fixture(scope="module")
def data() -> PlacementData:
    return load_placement_data(ROOT)


@pytest.fixture(scope="module")
def pools() -> tuple[SlotPool, ...]:
    return build_slot_pools(load_slot_pools(OVERRIDES / "slot_pools.csv"))


def _validate(pools: tuple[SlotPool, ...], data: PlacementData) -> None:
    known = known_ids(data.table, data.armor_sets, data.bosses, RULES)
    validate_slot_pools(pools, data.table, known)


def _resolved(
    pools: tuple[SlotPool, ...], table: tuple[Item, ...]
) -> Mapping[tuple[str, str], tuple[Item, ...]]:
    return {
        (row.character_class_id, row.slot): resolve_items(row.selectors, table) for row in pools
    }


def _subcategories(rows: tuple[Item, ...]) -> set[str | None]:
    return {row.subcategory for row in rows}


def test_builds_and_their_odds() -> None:
    character_classes = load_character_classes(OVERRIDES / "character_classes.csv")
    assert [
        (character_class.id, character_class.name, character_class.odds)
        for character_class in character_classes
    ] == [
        ("knight", "Knight", 1),
        ("warrior_2h", "2H Warrior", 1),
        ("warrior_dw", "Dual-Wield Warrior", 1),
        ("ranger", "Ranger", 0.5),
        ("sorcerer", "Sorcerer", 1),
        ("pyromancer", "Pyromancer", 1),
        ("spellblade", "Spellblade", 1),
        ("jester", "Jester", 0.25),
    ]


def test_the_real_pools_are_valid(pools: tuple[SlotPool, ...], data: PlacementData) -> None:
    assert len(pools) == 72
    _validate(pools, data)


def test_hands_resolve_to_their_classes(pools: tuple[SlotPool, ...], data: PlacementData) -> None:
    resolved = _resolved(pools, data.table)
    assert _subcategories(resolved["knight", "rh"]) == UNPAIRED | {"thrusting_shield"}
    assert _subcategories(resolved["warrior_2h", "rh"]) == MELEE | {"thrusting_shield"}
    assert _subcategories(resolved["warrior_dw", "rh"]) == MELEE
    assert _subcategories(resolved["warrior_dw", "lh"]) == UNPAIRED | {None}
    assert _subcategories(resolved["spellblade", "rh"]) == UNPAIRED
    assert _subcategories(resolved["ranger", "rh"]) == RANGED
    assert _subcategories(resolved["sorcerer", "rh"]) == {"glintstone_staff"}
    assert _subcategories(resolved["pyromancer", "rh"]) == {"sacred_seal"}
    assert _subcategories(resolved["sorcerer", "lh"]) == {
        None,
        "glintstone_staff",
        "small_shield",
        "medium_shield",
    }
    assert _subcategories(resolved["pyromancer", "lh"]) == {
        None,
        "sacred_seal",
        "small_shield",
        "medium_shield",
    }
    assert _subcategories(resolved["spellblade", "lh"]) == CATALYST
    assert len(resolved["knight", "lh"]) == 78 + 1
    assert "none" in {row.id for row in resolved["knight", "lh"]}


def test_pool_sizes_follow_the_categories(
    pools: tuple[SlotPool, ...], data: PlacementData
) -> None:
    resolved = _resolved(pools, data.table)
    assert len(resolved["sorcerer", "rh"]) == 20
    assert len(resolved["pyromancer", "rh"]) == 12
    assert len(resolved["sorcerer", "lh"]) == 20 + 19 + 32 + 1
    assert len(resolved["pyromancer", "lh"]) == 12 + 19 + 32 + 1
    assert len(resolved["spellblade", "lh"]) == 32
    assert {row.category for row in resolved["sorcerer", "spell"]} == {"sorcery"}
    assert {row.category for row in resolved["pyromancer", "spell"]} == {"incantation"}
    assert len(resolved["sorcerer", "spell"]) == 67
    assert len(resolved["pyromancer", "spell"]) == 86
    assert len(resolved["spellblade", "spell"]) == 67 + 86
    for row in pools:
        found = resolved[row.character_class_id, row.slot]
        if row.slot == "item":
            assert len(found) == 9 + 81
        elif row.slot.startswith("talisman"):
            assert len(found) == 41
        elif row.slot.endswith("_ash"):
            assert len(found) == 111
        elif row.slot.startswith("rule"):
            assert not found


def test_seals_roll_at_twice_the_odds_of_staves(data: PlacementData) -> None:
    assert {row.odds for row in data.table if row.subcategory == "sacred_seal"} == {2}
    assert {row.odds for row in data.table if row.subcategory == "glintstone_staff"} == {1}


def test_empty_hands_and_spells_hold_only_none(
    pools: tuple[SlotPool, ...], data: PlacementData
) -> None:
    resolved = _resolved(pools, data.table)
    empty = [
        ("warrior_2h", "lh"),
        ("ranger", "lh"),
        ("jester", "lh"),
        *((character_class, "spell") for character_class in ("knight", "warrior_2h", "warrior_dw")),
        ("ranger", "spell"),
        ("jester", "spell"),
    ]
    for key in empty:
        assert [row.id for row in resolved[key]] == ["none"], key


def test_jester_right_hand(pools: tuple[SlotPool, ...], data: PlacementData) -> None:
    found = _resolved(pools, data.table)["jester", "rh"]
    assert "none" in {row.id for row in found}
    assert _subcategories(found) == {
        None,
        "greatshield",
        "torch",
        "perfume_bottle",
        "glintstone_staff",
        "fist",
    }
    assert [row.name for row in found if row.subcategory == "fist"] == ["Grafted Dragon"]
    assert {row.name for row in found if row.subcategory == "greatshield"} == {
        "Briar Greatshield",
        "Spiked Palisade Shield",
        "Fingerprint Stone Shield",
        "Jellyfish Shield",
        "Visage Shield",
        "One-Eyed Shield",
    }
    assert len(found) == 1 + 8 + 5 + 6 + 1 + 1
    staves =[row for row in found if row.subcategory == "glintstone_staff"]
    assert [row.name for row in staves] == ["Demi-Human Queen's Staff"]
    assert staves[0].infusable


def test_jester_staff_is_reachable_exactly_with_its_ash(data: PlacementData) -> None:
    def regions(item: str) -> set[str]:
        rows = [one.row for one in data.placements if one.row.item_id == item]
        assert all(row.location_id for row in rows), f"{item} has a boss-tied row"
        return {data.region_of_location[row.location_id or ""] for row in rows}

    assert regions("demi_human_queens_staff") == regions("spinning_weapon") == {"limgrave"}


def _swap(
    pools: tuple[SlotPool, ...], character_class: str, slot: str, cell: str
) -> tuple[SlotPool, ...]:
    kind, ids = cell.split(":")
    new = new_selector(kind, ids.split())
    return tuple(
        replace(row, selectors=(new,))
        if (row.character_class_id, row.slot) == (character_class, slot)
        else row
        for row in pools
    )


@pytest.mark.parametrize(
    ("character_class", "slot", "cell", "message"),
    [
        ("knight", "rh", "subcategory:melee glintstone_staff", "knight rh has the wrong catalysts"),
        ("sorcerer", "lh", "subcategory:catalyst", "sorcerer lh has the wrong catalysts"),
        ("pyromancer", "rh", "subcategory:catalyst", "pyromancer rh has the wrong catalysts"),
        ("spellblade", "lh", "subcategory:sacred_seal", "spellblade lh has the wrong catalysts"),
        ("jester", "rh", "subcategory:sacred_seal", "jester rh has the wrong catalysts"),
        ("jester", "rh", "subcategory:glintstone_staff", "jester rh has the wrong catalysts"),
        ("knight", "rh", "subcategory:torch", "knight rh has the wrong torches"),
        ("jester", "rh", "subcategory:torch", "jester rh has the wrong torches"),
        ("knight", "rule_1", "item:none", "knight rule_1 selects by item"),
        ("knight", "item", "rule:parry_only", "knight item selects by rule"),
    ],
)
def test_out_of_scope_pools_fail(
    pools: tuple[SlotPool, ...],
    data: PlacementData,
    character_class: str,
    slot: str,
    cell: str,
    message: str,
) -> None:
    with pytest.raises(BuildError, match=message):
        _validate(_swap(pools, character_class, slot, cell), data)


def test_an_unknown_id_fails(pools: tuple[SlotPool, ...], data: PlacementData) -> None:
    with pytest.raises(BuildError, match="selector matches nothing: item: typo"):
        _validate(_swap(pools, "knight", "item", "item:typo"), data)


def test_missing_extra_repeated_and_empty_rows_fail(
    pools: tuple[SlotPool, ...], data: PlacementData
) -> None:
    missing = tuple(row for row in pools if (row.character_class_id, row.slot) != ("knight", "lh"))
    with pytest.raises(BuildError, match="knight lacks lh"):
        _validate(missing, data)
    extra = (*pools, SlotPool("sorcerer", "rh_ash", (Selector("category", ("ash",)),)))
    with pytest.raises(BuildError, match="sorcerer should not have rh_ash"):
        _validate(extra, data)
    with pytest.raises(BuildError, match="knight rh repeats"):
        _validate((*pools, pools[0]), data)
    empty = (replace(pools[0], selectors=()), *pools[1:])
    with pytest.raises(BuildError, match="knight rh has no selector"):
        _validate(empty, data)


def test_selector_cells_parse(tmp_path: Path) -> None:
    path = tmp_path / "slot_pools.csv"
    path.write_text(
        "character_class_id,slot,selectors\n"
        "jester,rh,category:none; subcategory:torch perfume_bottle\n"
        "jester,rule_1,rule:\n",
        encoding="utf-8",
    )
    assert load_slot_pools(path) == (
        SlotPoolRow(
            "jester",
            "rh",
            (("category", ("none",)), ("subcategory", ("torch", "perfume_bottle"))),
        ),
        SlotPoolRow("jester", "rule_1", (("rule", ()),)),
    )
    assert build_slot_pools(load_slot_pools(path))[1].selectors == (Selector("rule", None),)


@pytest.mark.parametrize(
    ("row", "message"),
    [
        ("paladin,rh,category:ash", "unknown character class"),
        ("knight,talisman_3,category:ash", "unknown slot"),
        ("knight,rh,melee", "has no kind"),
    ],
)
def test_bad_rows_fail_to_load(tmp_path: Path, row: str, message: str) -> None:
    path = tmp_path / "slot_pools.csv"
    path.write_text(f"character_class_id,slot,selectors\n{row}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_slot_pools(path)


def test_an_unknown_kind_fails_to_build() -> None:
    with pytest.raises(BuildError, match="unknown selector kind: weapon"):
        build_slot_pools([SlotPoolRow("knight", "rh", (("weapon", ("katana",)),))])


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("knight,Knight,1\n", "expected the character classes"),
        ("knight,Knight,-1\n", "has odds"),
    ],
)
def test_bad_builds_fail_to_load(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "character_classes.csv"
    path.write_text(f"id,name,odds\n{body}", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_character_classes(path)
