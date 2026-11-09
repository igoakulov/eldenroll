"""Tests for the combat rule table against `prd.md` §7."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.schema import LoaderError

CSV = Path(__file__).resolve().parents[2] / "data" / "overrides" / "combat_rules.csv"

NAMES = {
    "None",
    "Do not get hit",
    "Apply status",
    "Land a riposte",
    "Dodge 1x with crouch or jump",
    "Gesture 3x without getting hit",
    "Gesture after every flask",
    "R1 only",
    "R2 only",
    "Charged R2 only",
    "L1 only (can swap hands)",
    "L2 only",
    "Jump attacks only",
    "Rolling / crouch attacks only",
    "Parry only",
    "No ripostes",
    "No lock-on",
    "No healing flasks",
    "No armor",
    "No talismans",
    "No rolling",
    "Heavy rolling",
    "Overloaded",
    "Drink Deflecting Hardtear",
    "Drink Crimson-Sapping Cracked Tear",
    "Drink Bloodsucking Cracked Tear",
    "Drink Stonebarb Cracked Tear",
    "Drink Ruptured Crystal Tear",
}


def test_the_28_rules_match_the_prd() -> None:
    rules = load_combat_rules(CSV)
    assert len(rules) == 28
    assert {rule.name for rule in rules} == NAMES


def test_odds_other_than_one() -> None:
    rules = load_combat_rules(CSV)
    assert {rule.id: rule.odds for rule in rules if rule.odds != 1} == {
        "none": 4,
        "drink_deflecting_hardtear": 0,
        "drink_crimson_sapping_cracked_tear": 0,
        "drink_bloodsucking_cracked_tear": 0,
    }


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("r1_only,,1\n", "empty name"),
        ("r1,R1 only,1\n", "is not the slug"),
        ("r1_only,R1 only,-1\n", "has odds"),
        ("r1_only,R1 only,1\nr1_only,R1 only,1\n", "duplicate rule id"),
    ],
)
def test_bad_rows_fail_to_load(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "combat_rules.csv"
    path.write_text(f"id,name,odds\n{body}", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_combat_rules(path)
