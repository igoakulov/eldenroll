"""Tests for the modifier rows, starting with the combat rules' P1 rows
(`web/src/engine/README.md#Combat rules`)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.modifiers import bosses_of_region, build_modifiers
from eldenroll.build.slot_pools import build_slot_pools
from eldenroll.errors import BuildError
from eldenroll.loaders.character_classes import load_slot_pools
from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.modifiers import ConditionRow, ModifierRow, load_modifiers
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.modifier import CharacterClassCondition, Modifier, RolledCondition
from eldenroll.model.selector import Selector, SelectorKind
from eldenroll.validate.modifiers import validate_modifiers, validate_rolling_order
from eldenroll.validate.placement import PlacementData
from eldenroll.validate.selectors import known_ids

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"


@pytest.fixture(scope="module")
def modifiers(placement_data: PlacementData) -> tuple[Modifier, ...]:
    return build_modifiers(
        load_modifiers(OVERRIDES / "modifiers.csv"),
        bosses_of_region(placement_data.bosses, placement_data.region_of_location),
    )


def _validate(rows: tuple[Modifier, ...], placement_data: PlacementData) -> None:
    rules = [rule.id for rule in load_combat_rules(OVERRIDES / "combat_rules.csv")]
    validate_modifiers(
        rows,
        known_ids(placement_data.table, placement_data.armor_sets, placement_data.bosses, rules),
    )


def _rule_row(rolled: str, removed: str) -> Modifier:
    return Modifier(
        id=f"{rolled}_removes",
        when=(RolledCondition(("rh",), Selector("subcategory", (rolled,))),),
        target=Selector("rule", (removed,)),
        value=0,
    )


def test_no_row_names_a_rule_that_never_rolls(modifiers: tuple[Modifier, ...]) -> None:
    rules = load_combat_rules(OVERRIDES / "combat_rules.csv")
    parked = {rule.id for rule in rules if rule.odds == 0}
    named = {one for row in modifiers if row.target.kind == "rule" for one in row.target.ids or ()}
    assert not named & parked


def test_a_target_rolled_before_its_condition_fails(placement_data: PlacementData) -> None:
    pools = build_slot_pools(load_slot_pools(OVERRIDES / "slot_pools.csv"))
    late = Modifier(
        "late",
        (RolledCondition(("talisman_1",), Selector("item", ("blue_dancer_charm",))),),
        Selector("subcategory", ("katana",)),
        0,
    )
    with pytest.raises(BuildError, match="after their conditions: late"):
        validate_rolling_order([late], pools, placement_data.table)


@pytest.mark.parametrize(
    ("rows", "message"),
    [
        ((_rule_row("torch", "r2_only"), _rule_row("torch", "r1_only")), "torch_removes repeats"),
        ((replace(_rule_row("torch", "r2_only"), when=()),), "torch_removes has no condition"),
        (
            (
                Modifier(
                    "late",
                    (RolledCondition(("rule",), Selector("rule", ("r1_only",))),),
                    Selector("rule", ("r2_only",)),
                    0,
                ),
            ),
            "late targets a rule before its condition",
        ),
    ],
)
def test_bad_rows_fail(
    rows: tuple[Modifier, ...], message: str, placement_data: PlacementData
) -> None:
    with pytest.raises(BuildError, match=message):
        _validate(rows, placement_data)


@pytest.mark.parametrize("kind", ["rule", "item"])
def test_an_unknown_id_fails(kind: SelectorKind, placement_data: PlacementData) -> None:
    row = Modifier("x", (CharacterClassCondition(("sorcerer",)),), Selector(kind, ("typo",)), 0)
    with pytest.raises(BuildError, match=f"selector matches nothing: {kind}: typo"):
        _validate((row,), placement_data)


def test_a_boss_target_fails(placement_data: PlacementData) -> None:
    row = Modifier(
        "x",
        (CharacterClassCondition(("sorcerer",)),),
        Selector("boss", (placement_data.bosses[0].id,)),
        2,
    )
    with pytest.raises(BuildError, match="a boss cannot be a modifier target"):
        _validate((row,), placement_data)


def test_a_boss_condition_passes(placement_data: PlacementData) -> None:
    condition = RolledCondition(("rh",), Selector("boss", (placement_data.bosses[0].id,)))
    _validate((Modifier("x", (condition,), Selector("rule", ("r1_only",)), 2),), placement_data)


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
                ConditionRow(("rh",), True, "subcategory", ("melee", "torch")),
                ConditionRow(("character_class",), False, "", ("sorcerer", "jester")),
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
            ConditionRow(("character_class",), False, "", ("paladin",)),
            "bad character class condition: paladin",
        ),
        (ConditionRow(("talisman_3",), False, "item", ("a",)), "unknown slot talisman_3"),
        (ConditionRow(("rh",), False, "weapon", ("a",)), "unknown selector kind: weapon"),
    ],
)
def test_unknown_names_fail_to_build(condition: ConditionRow, message: str) -> None:
    with pytest.raises(BuildError, match=message):
        build_modifiers([ModifierRow("a", (condition,), ("rule", ("r1_only",)), 0)])
