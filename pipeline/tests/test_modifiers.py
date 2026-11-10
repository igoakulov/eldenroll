"""Tests for the modifier rows, starting with the combat rules' P1 rows
(`web/src/engine/README.md#Combat rules`)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.modifiers import build_modifiers
from eldenroll.build.slot_pools import build_slot_pools
from eldenroll.errors import BuildError
from eldenroll.loaders.character_classes import load_slot_pools
from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.modifiers import ConditionRow, ModifierRow, load_modifiers
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.modifier import CharacterClassCondition, Modifier, RolledCondition
from eldenroll.model.selector import Selector, SelectorKind
from eldenroll.model.vocabulary import MELEE, UNPAIRED
from eldenroll.validate.modifiers import validate_modifiers, validate_rolling_order
from eldenroll.validate.placement import PlacementData, load_placement_data
from eldenroll.validate.selectors import known_ids, resolve_items

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

ALLOWED_TOGETHER = {
    ("jump_attacks_only", "r1_only"),
    ("jump_attacks_only", "r2_only"),
    ("jump_attacks_only", "l1_only_can_swap_hands"),
    ("land_a_riposte", "r1_only"),
    ("no_ripostes", "r1_only"),
    ("do_not_get_hit", "no_rolling"),
    ("do_not_get_hit", "gesture_3x_without_getting_hit"),
    ("no_healing_flasks", "overloaded"),
    ("no_healing_flasks", "drink_ruptured_crystal_tear"),
    ("no_talismans", "heavy_rolling"),
    ("no_rolling", "dodge_1x_with_crouch_or_jump"),
}
# Each pair is contradictory, or one rule is a harder version of the other, or voids it.
EXCLUDED = {
    ("r1_only", "r2_only"),
    ("r1_only", "rolling_crouch_attacks_only"),
    ("r2_only", "charged_r2_only"),
    ("l1_only_can_swap_hands", "r1_only"),
    ("l2_only", "parry_only"),
    ("jump_attacks_only", "rolling_crouch_attacks_only"),
    ("jump_attacks_only", "charged_r2_only"),
    ("parry_only", "land_a_riposte"),
    ("parry_only", "no_ripostes"),
    ("parry_only", "r1_only"),
    ("land_a_riposte", "no_ripostes"),
    ("no_ripostes", "r2_only"),
    ("no_rolling", "heavy_rolling"),
    ("no_rolling", "overloaded"),
    ("heavy_rolling", "overloaded"),
    ("no_rolling", "rolling_crouch_attacks_only"),
    ("overloaded", "no_armor"),
    ("overloaded", "no_talismans"),
    ("overloaded", "do_not_get_hit"),
    ("heavy_rolling", "no_armor"),
    ("do_not_get_hit", "no_healing_flasks"),
    ("do_not_get_hit", "gesture_after_every_flask"),
    ("no_healing_flasks", "gesture_after_every_flask"),
    ("do_not_get_hit", "drink_ruptured_crystal_tear"),
    ("drink_stonebarb_cracked_tear", "drink_ruptured_crystal_tear"),
}


@pytest.fixture(scope="module")
def data() -> PlacementData:
    return load_placement_data(ROOT)


@pytest.fixture(scope="module")
def modifiers() -> tuple[Modifier, ...]:
    return build_modifiers(load_modifiers(OVERRIDES / "modifiers.csv"))


def _validate(rows: tuple[Modifier, ...], data: PlacementData) -> None:
    rules =[rule.id for rule in load_combat_rules(OVERRIDES / "combat_rules.csv")]
    validate_modifiers(rows, known_ids(data.table, data.armor_sets, data.bosses, rules))


def _excludes(rows: tuple[Modifier, ...]) -> set[tuple[str, str]]:
    return {
        (rolled, removed)
        for row in rows
        for one in row.when
        if isinstance(one, RolledCondition) and one.slot == "rule_1"
        for rolled in one.selector.ids or ()
        for removed in row.target.ids or ()
    }


def _rule_row(rolled: str, removed: str) -> Modifier:
    return Modifier(
        id=f"{rolled}_excludes",
        when=(RolledCondition("rule_1", Selector("rule", (rolled,))),),
        target=Selector("rule", (removed,)),
        value=0,
    )


def test_the_real_modifiers_are_valid(modifiers: tuple[Modifier, ...], data: PlacementData) -> None:
    _validate(modifiers, data)


@pytest.mark.parametrize(("first", "second"), sorted(EXCLUDED))
def test_pairs_that_cannot_roll_together(
    modifiers: tuple[Modifier, ...], first: str, second: str
) -> None:
    pairs = _excludes(modifiers)
    assert (first, second) in pairs
    assert (second, first) in pairs


@pytest.mark.parametrize(("first", "second"), sorted(ALLOWED_TOGETHER))
def test_pairs_that_can_roll_together(
    modifiers: tuple[Modifier, ...], first: str, second: str
) -> None:
    pairs = _excludes(modifiers)
    assert (first, second) not in pairs
    assert (second, first) not in pairs


def test_no_row_names_a_rule_that_never_rolls(modifiers: tuple[Modifier, ...]) -> None:
    rules = load_combat_rules(OVERRIDES / "combat_rules.csv")
    parked = {rule.id for rule in rules if rule.odds == 0}
    named = {one for row in modifiers if row.target.kind == "rule" for one in row.target.ids or ()}
    named |= {one for pair in _excludes(modifiers) for one in pair}
    assert not named & parked


def test_none_excludes_nothing(modifiers: tuple[Modifier, ...]) -> None:
    assert not [pair for pair in _excludes(modifiers) if "none" in pair]


@pytest.mark.parametrize(
    ("slot", "selector"),
    [
        ("rh", Selector("item", ("blasphemous_blade",))),
        ("lh", Selector("item", ("blasphemous_blade",))),
        ("rh_ash", Selector("item", ("prayerful_strike",))),
        ("lh_ash", Selector("item", ("prayerful_strike",))),
    ],
)
def test_l2_healing_boosts_its_rules_and_removes_the_rest(
    modifiers: tuple[Modifier, ...], slot: str, selector: Selector
) -> None:
    rows = [row for row in modifiers if row.when == (RolledCondition(slot, selector),)]
    assert {row.value: set(row.target.ids or ()) for row in rows} == {
        5: {"no_healing_flasks", "overloaded"},
        0: {
            "r1_only",
            "r2_only",
            "charged_r2_only",
            "l1_only_can_swap_hands",
            "jump_attacks_only",
            "rolling_crouch_attacks_only",
            "parry_only",
        },
    }


@pytest.mark.parametrize("slot", ["talisman_1", "talisman_2"])
def test_blue_dancer_charm_makes_no_armor_strong(
    modifiers: tuple[Modifier, ...], slot: str
) -> None:
    condition = RolledCondition(slot, Selector("item", ("blue_dancer_charm",)))
    rows = [row for row in modifiers if row.when == (condition,) and row.target.kind == "rule"]
    assert [(row.target, row.value) for row in rows] == [(Selector("rule", ("no_armor",)), 10)]


def test_dual_wield_boosts_each_unpaired_class_in_lh(modifiers: tuple[Modifier, ...]) -> None:
    character_class = CharacterClassCondition(("warrior_dw",))
    rows = [row for row in modifiers if row.id.startswith("warrior_dw_pairs_")]
    assert {one for row in rows for one in row.target.ids or ()} == UNPAIRED
    for row in rows:
        assert row.value == 67
        assert row.when == (character_class, RolledCondition("rh", row.target))


def test_only_grafted_dragon_loses_odds_in_dual_wield_rh(
    modifiers: tuple[Modifier, ...], data: PlacementData
) -> None:
    pools = build_slot_pools(load_slot_pools(OVERRIDES / "slot_pools.csv"))
    pool = next(row for row in pools if (row.character_class_id, row.slot) == ("warrior_dw", "rh"))
    rh = {item.id for item in resolve_items(pool.selectors, data.table)}
    known_before_rh = [
        row
        for row in modifiers
        if row.when
        and all(
            isinstance(one, CharacterClassCondition) and "warrior_dw" in one.character_classes
            for one in row.when
        )
    ]
    assert [
        row.id
        for row in known_before_rh
        if rh & {item.id for item in resolve_items((row.target,), data.table)}
    ] == ["grafted_dragon_only_on_jester"]


def test_a_paired_rh_leaves_only_none_in_dual_wield_lh(modifiers: tuple[Modifier, ...]) -> None:
    rows = {row.id: row for row in modifiers}
    for name in ("warrior_dw_paired_class_empties_lh", "warrior_dw_paired_weapon_empties_lh"):
        assert rows[name].target.ids == tuple(sorted(UNPAIRED))
        assert rows[name].value == 0
    keeps = rows["warrior_dw_unpaired_rh_keeps_lh_unpaired"]
    assert "none" in (keeps.target.ids or ())
    assert {one.negated for one in keeps.when if isinstance(one, RolledCondition)} == {True}


def test_paired_weapons_and_grafted_dragon_stay_off_the_other_character_classes(
    modifiers: tuple[Modifier, ...],
) -> None:
    rows = {row.id: row for row in modifiers}
    assert rows["knight_spellblade_no_paired_weapons"].when == (
        CharacterClassCondition(("knight", "spellblade")),
    )
    assert len(rows["knight_spellblade_no_paired_weapons"].target.ids or ()) == 9
    assert rows["grafted_dragon_only_on_jester"].when == (
        CharacterClassCondition(("warrior_2h", "warrior_dw")),
    )


def test_the_real_rows_roll_their_targets_after_their_conditions(
    modifiers: tuple[Modifier, ...], data: PlacementData
) -> None:
    pools = build_slot_pools(load_slot_pools(OVERRIDES / "slot_pools.csv"))
    validate_rolling_order(modifiers, pools, data.table)


def test_a_target_rolled_before_its_condition_fails(data: PlacementData) -> None:
    pools = build_slot_pools(load_slot_pools(OVERRIDES / "slot_pools.csv"))
    late = Modifier(
        "late",
        (RolledCondition("talisman_1", Selector("item", ("blue_dancer_charm",))),),
        Selector("subcategory", ("katana",)),
        0,
    )
    with pytest.raises(BuildError, match="after their conditions: late"):
        validate_rolling_order([late], pools, data.table)


@pytest.mark.parametrize("slot", ["talisman_1", "talisman_2"])
@pytest.mark.parametrize(
    ("talismans", "kind", "targets", "value"),
    [
        (("claw_talisman",), "rule", ("jump_attacks_only",), 1000000),
        (("claw_talisman",), "armor_set", ("gravebird_set", "raptors_set"), 10000),
        (("shard_of_alexander", "warrior_jar_shard"), "rule", ("l2_only",), 1000000),
        (("axe_talisman",), "rule", ("charged_r2_only", "drink_stonebarb_cracked_tear"), 1000000),
    ],
)
def test_talismans_reach_their_targets_from_either_slot(
    modifiers: tuple[Modifier, ...],
    slot: str,
    talismans: tuple[str, ...],
    kind: SelectorKind,
    targets: tuple[str, ...],
    value: int,
) -> None:
    condition = RolledCondition(slot, Selector("item", talismans))
    rows = [row for row in modifiers if row.when == (condition,) and row.target.kind == kind]
    assert [(row.target.ids, row.value) for row in rows] == [(targets, value)]


@pytest.mark.parametrize("slot", ["rule_1", "rule_2"])
def test_jump_attacks_boost_the_jump_sets_from_either_rule(
    modifiers: tuple[Modifier, ...], slot: str
) -> None:
    condition = RolledCondition(slot, Selector("rule", ("jump_attacks_only",)))
    rows = [
        row for row in modifiers if row.when == (condition,) and row.target.kind == "armor_set"
    ]
    assert [(row.target, row.value) for row in rows] == [
        (Selector("armor_set", ("gravebird_set", "raptors_set")), 10000)
    ]


@pytest.mark.parametrize("hand", ["rh", "lh"])
def test_dancers_weapons_reach_the_set_and_talismans_from_either_hand(
    modifiers: tuple[Modifier, ...], hand: str
) -> None:
    rows = [
        row
        for row in modifiers
        if len(row.when) == 1
        and isinstance(row.when[0], RolledCondition)
        and row.when[0].slot == hand
        and "hand_of_malenia" in (row.when[0].selector.ids or ())
    ]
    assert {row.target.kind: row.value for row in rows} == {"armor_set": 1000000, "item": 10000}
    for row in rows:
        condition = row.when[0]
        assert isinstance(condition, RolledCondition)
        assert len(condition.selector.ids or ()) == 8


def test_blue_dancer_charm_needs_light_hands(modifiers: tuple[Modifier, ...]) -> None:
    rows = {row.id: row for row in modifiers}
    lightest = {"dagger", "straight_sword", "curved_sword", "thrusting_sword", "whip"}
    empty_lh = RolledCondition("lh", Selector("category", ("none",)), negated=True)
    heavy = rows["heavy_rh_removes_blue_dancer_charm"].when[0]
    assert isinstance(heavy, RolledCondition)
    assert len(heavy.selector.ids or ()) == 19
    assert {"twinblade", "glintstone_staff", "thrusting_shield"} <= set(heavy.selector.ids or ())
    assert not lightest & set(heavy.selector.ids or ())
    rh = rows["two_hands_need_a_lightest_rh_for_blue_dancer_charm"].when
    assert rh[1] == empty_lh
    assert isinstance(rh[0], RolledCondition)
    assert rh[0].negated
    assert set(rh[0].selector.ids or ()) == lightest
    lh = rows["two_hands_need_a_light_lh_for_blue_dancer_charm"].when
    assert lh[1] == empty_lh
    assert isinstance(lh[0], RolledCondition)
    assert set(lh[0].selector.ids or ()) == lightest | {
        "small_shield",
        "medium_shield",
        "glintstone_staff",
        "sacred_seal",
    }
    for row in (heavy, *rh, *lh):
        assert isinstance(row, RolledCondition)


def test_jester_favours_an_empty_right_hand(modifiers: tuple[Modifier, ...]) -> None:
    row = next(one for one in modifiers if one.id == "jester_none_x4")
    assert (row.when, row.target, row.value) == (
        (CharacterClassCondition(("jester",)),),
        Selector("item", ("none",)),
        4,
    )


def test_knight_left_hand_follows_the_right_hand(modifiers: tuple[Modifier, ...]) -> None:
    rows = {row.id: row for row in modifiers}
    condition = RolledCondition("rh", Selector("subcategory", ("thrusting_shield",)))
    empties = rows["knight_thrusting_shield_empties_lh"]
    assert empties.when == (CharacterClassCondition(("knight",)), condition)
    assert empties.target.ids == ("greatshield", "medium_shield", "small_shield")
    keeps = rows["knight_other_rh_keeps_a_shield_in_lh"]
    assert keeps.when == (CharacterClassCondition(("knight",)), replace(condition, negated=True))
    assert keeps.target == Selector("item", ("none",))


def test_requirements_read_the_right_slots(modifiers: tuple[Modifier, ...]) -> None:
    rows = {row.id: row for row in modifiers}
    parry = rows["parry_only_needs_a_parry_ash"]
    assert parry.target.ids == ("parry_only",)
    assert {one.slot for one in parry.when if isinstance(one, RolledCondition)} == {
        "rh_ash",
        "lh_ash",
    }
    weapon = rows["melee_rules_need_a_melee_weapon_in_a_hand"].when[0]
    assert isinstance(weapon, RolledCondition)
    assert weapon.negated
    assert set(weapon.selector.ids or ()) > MELEE
    assert "bow" not in (weapon.selector.ids or ())
    assert "glintstone_staff" not in (weapon.selector.ids or ())
    assert rows["l2_only_not_on_pure_casters"].when == (
        CharacterClassCondition(("sorcerer", "pyromancer")),
    )


@pytest.mark.parametrize(
    ("rows", "message"),
    [
        ((_rule_row("r1_only", "r2_only"),), "r1_only excludes r2_only but not the reverse"),
        ((_rule_row("r1_only", "r1_only"),), "r1_only excludes itself"),
        (
            (
                _rule_row("r1_only", "r2_only"),
                _rule_row("r2_only", "r1_only"),
                _rule_row("r1_only", "r2_only"),
            ),
            "r1_only_excludes repeats",
        ),
        ((replace(_rule_row("r1_only", "r2_only"), when=()),), "r1_only_excludes has no condition"),
        (
            (
                Modifier(
                    "late",
                    (RolledCondition("rule_2", Selector("rule", ("r1_only",))),),
                    Selector("rule", ("r2_only",)),
                    0,
                ),
            ),
            "late targets a rule before its condition",
        ),
    ],
)
def test_bad_rows_fail(rows: tuple[Modifier, ...], message: str, data: PlacementData) -> None:
    with pytest.raises(BuildError, match=message):
        _validate(rows, data)


@pytest.mark.parametrize("kind", ["rule", "item"])
def test_an_unknown_id_fails(kind: SelectorKind, data: PlacementData) -> None:
    row = Modifier("x", (CharacterClassCondition(("sorcerer",)),), Selector(kind, ("typo",)), 0)
    with pytest.raises(BuildError, match=f"selector matches nothing: {kind}: typo"):
        _validate((row,), data)


def test_a_boss_target_fails(data: PlacementData) -> None:
    row = Modifier(
        "x", (CharacterClassCondition(("sorcerer",)),), Selector("boss", (data.bosses[0].id,)), 2
    )
    with pytest.raises(BuildError, match="a boss cannot be a modifier target"):
        _validate((row,), data)


def test_a_boss_condition_passes(data: PlacementData) -> None:
    condition = RolledCondition("rh", Selector("boss", (data.bosses[0].id,)))
    _validate((Modifier("x", (condition,), Selector("rule", ("r1_only",)), 2),), data)


def test_cells_parse(tmp_path: Path) -> None:
    path = tmp_path / "modifiers.csv"
    path.write_text(
        "id,when,target,value\n"
        "a,rh!=subcategory:melee torch; character_class=sorcerer jester,rule:r1_only,0\n",
        encoding="utf-8",
    )
    assert load_modifiers(path) == (
        ModifierRow(
            "a",
            (
                ConditionRow("rh", True, "subcategory", ("melee", "torch")),
                ConditionRow("character_class", False, "", ("sorcerer", "jester")),
            ),
            ("rule", ("r1_only",)),
            0,
        ),
    )
    built = build_modifiers(load_modifiers(path))[0]
    first = built.when[0]
    assert isinstance(first, RolledCondition)
    assert "katana" in (first.selector.ids or ())


@pytest.mark.parametrize(
    ("row", "message"),
    [
        (",rh=category:none,rule:r1_only,0", "empty id"),
        ("a,rh,rule:r1_only,0", "has no operator"),
        ("a,character_class!=sorcerer,rule:r1_only,0", "cannot negate a character class"),
        ("a,rh=none,rule:r1_only,0", "has no kind"),
        ("a,rh=category:none,r1_only,0", "has no kind"),
        ("a,rh=category:none,rule:r1_only,-1", "has odds"),
    ],
)
def test_bad_cells_fail_to_load(tmp_path: Path, row: str, message: str) -> None:
    path = tmp_path / "modifiers.csv"
    path.write_text(f"id,when,target,value\n{row}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_modifiers(path)


@pytest.mark.parametrize(
    ("condition", "message"),
    [
        (
            ConditionRow("character_class", False, "", ("paladin",)),
            "bad character class condition: paladin",
        ),
        (ConditionRow("talisman_3", False, "item", ("a",)), "unknown slot talisman_3"),
        (ConditionRow("rh", False, "weapon", ("a",)), "unknown selector kind: weapon"),
    ],
)
def test_unknown_names_fail_to_build(condition: ConditionRow, message: str) -> None:
    with pytest.raises(BuildError, match=message):
        build_modifiers([ModifierRow("a", (condition,), ("rule", ("r1_only",)), 0)])
