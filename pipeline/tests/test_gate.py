"""Tests for the Phase 0 gate and the build command (`data/README.md#Build`)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path
from typing import Any, cast

import pytest

from eldenroll.build import database as build_database
from eldenroll.build.database import gate_problems, import_report, main
from eldenroll.build.serialize import TABLE_FIELDS, database_rows, render
from eldenroll.errors import BuildError
from eldenroll.model.ash_compatibility import AshCompatibility
from eldenroll.model.database import Database
from eldenroll.model.item_location import ItemLocation
from eldenroll.model.modifier import CharacterClassCondition, Modifier
from eldenroll.model.selector import Selector
from eldenroll.validate.gate_data import GateData
from eldenroll.validate.quality import quality_problems
from eldenroll.validate.structure import several_top_tiers, structure_problems

ROOT = Path(__file__).resolve().parents[2]
PIPELINE = ROOT / "pipeline"
Change = Callable[[Database], Database]


def _without_item(item_id: str) -> Change:
    return lambda database: replace(
        database, items=tuple(row for row in database.items if row.id != item_id)
    )


def _set_item(item_id: str, **changes: Any) -> Change:
    def change(database: Database) -> Database:
        items = tuple(
            replace(row, **changes) if row.id == item_id else row for row in database.items
        )
        return replace(database, items=items)

    return change


def _modifier(row_id: str, value: float, ids: tuple[str, ...] = ("r1_only",)) -> Modifier:
    return Modifier(
        id=row_id,
        when=(CharacterClassCondition(("sorcerer",)),),
        target=Selector("rule", ids),
        value=value,
    )


def _add_modifier(row: Modifier) -> Change:
    return lambda database: replace(database, modifiers=(*database.modifiers, row))


def _last_boss_at(location: str) -> Change:
    def change(database: Database) -> Database:
        return replace(
            database,
            bosses=(*database.bosses[:-1], replace(database.bosses[-1], location_id=location)),
        )

    return change


def _repeat_a_boss(database: Database) -> Database:
    repeat = replace(database.bosses[0], id="another_id")
    return replace(database, bosses=(*database.bosses, repeat))


def _repeat_a_set_piece(database: Database) -> Database:
    first = database.armor_sets[0]
    armor_set = replace(first, pieces=(*first.pieces, first.pieces[0]))
    return replace(database, armor_sets=(armor_set, *database.armor_sets[1:]))


def _swap_region_levels(database: Database) -> Database:
    regions = (replace(database.regions[0], region_level=999), *database.regions[1:])
    return replace(database, regions=regions)


def _add_location_row(row: ItemLocation) -> Change:
    return lambda database: replace(database, item_locations=(*database.item_locations, row))


def _add_ash_row(row: AshCompatibility) -> Change:
    return lambda database: replace(database, ash_compatibility=(*database.ash_compatibility, row))


def _drop_rows_of(item_id: str) -> Change:
    return lambda database: replace(
        database,
        item_locations=tuple(row for row in database.item_locations if row.item_id != item_id),
    )


def _rule_odds(rule_id: str, odds: float) -> Change:
    return lambda database: replace(
        database,
        rules=tuple(
            replace(rule, odds=odds) if rule.id == rule_id else rule for rule in database.rules
        ),
    )


def _catalyst_in_knight_rh(database: Database) -> Database:
    pools = tuple(
        replace(pool, selectors=(*pool.selectors, Selector("subcategory", ("sacred_seal",))))
        if (pool.character_class_id, pool.slot) == ("knight", "rh")
        else pool
        for pool in database.slot_pools
    )
    return replace(database, slot_pools=pools)


def _alias_nobody_uses(database: Database) -> Database:
    alias = replace(database.aliases[0], id="any_ghost")
    return replace(database, aliases=(*database.aliases, alias))


def test_the_real_data_passes_the_gate(gate_data: GateData) -> None:
    assert gate_problems(gate_data) == ()


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (_set_item("parry", subcategory="dagger"), "bad category or subcategory"),
        (_set_item("longsword", id="dagger"), "repeats the id: dagger"),
        (_set_item("longsword", name=""), "empty id or name on: longsword"),
        (_set_item("parry", category="none", subcategory=None), "expected one none row"),
        (_set_item("longsword", req_str=-1), "bad requirements on: longsword"),
        (_set_item("longsword", odds=-1), "odds below 0 on: item longsword"),
        (_set_item("gauntlets", odds=2), "odds on armor pieces, which roll only through a set"),
        (_set_item("longsword", infusable=None), "bad infusable or str_bonus_2h on: longsword"),
        (_set_item("parry", str_bonus_2h=False), "bad infusable or str_bonus_2h on: parry"),
        (_set_item("longsword", str_bonus_2h=False), "no class or override says so: longsword"),
        (_set_item("caestus", str_bonus_2h=True), "bonus in a class"),
        (_rule_odds("r1_only", -1), "odds below 0 on: rule r1_only"),
        (_add_ash_row(AshCompatibility("longsword", "weapon", "dagger")), "names no ash"),
        (_add_ash_row(AshCompatibility("parry", "weapon", "small_shield")), "not in its category"),
        (_swap_region_levels, "region_level is not unique and ascending"),
        (_last_boss_at("limgrave_nowhere"), "which its label does not resolve to"),
        (_repeat_a_boss, "bosses repeat a name and label"),
        (_repeat_a_boss, "boss rows, but the CSV, merges and additions give"),
        (_add_location_row(ItemLocation("ghost", location_id="limgrave")), "names no item: ghost"),
        (_add_location_row(ItemLocation("longsword", location_id="ghost")), "at no location"),
        (_add_location_row(ItemLocation("longsword", boss_instance_id="ghost")), "at no boss"),
        (_add_location_row(ItemLocation("none", location_id="limgrave")), "none by design: none"),
        (_drop_rows_of("longsword"), "no location row: longsword"),
        (_repeat_a_set_piece, "repeats a piece"),
        (_alias_nobody_uses, "alias with no member: any_ghost"),
        (_set_item("longsword", alias="ghost"), "item names no alias: ghost"),
        (_catalyst_in_knight_rh, "knight rh has the wrong catalysts"),
        (_add_modifier(_modifier("negative", -1)), "modifier value below 0: negative"),
        (_add_modifier(_modifier("ghost_rule", 2, ("ghost",))), "rule: ghost"),
        (_add_modifier(replace(_modifier("no_when", 2), when=())), "no_when has no condition"),
        (_add_modifier(_modifier("too_close", 5_000_000)), "guarantees too close in the rule pool"),
    ],
)
def test_a_broken_table_is_a_structure_problem(
    gate_data: GateData, change: Change, message: str
) -> None:
    problems = structure_problems(replace(gate_data, database=change(gate_data.database)))
    assert any(message in problem for problem in problems), problems


def test_off_tier_values_do_not_fail_the_spacing(gate_data: GateData) -> None:
    change = _add_modifier(_modifier("just_under_a_guarantee", 99))
    assert structure_problems(replace(gate_data, database=change(gate_data.database))) == ()


def test_several_top_tiers_are_reported_not_rejected(gate_data: GateData) -> None:
    top = several_top_tiers(gate_data.database.modifiers, gate_data.database.items)
    assert any(len(ids) > 1 for ids in top.values())
    assert not any("top" in problem for problem in structure_problems(gate_data))


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (_without_item("longsword"), "weapon rows, expected"),
        (_set_item("longsword", name="Dagger"), "name repeats within a category: Dagger (weapon)"),
        (_set_item("parry", name="Kick"), "excluded name has a row: Kick (ash)"),
        (_set_item("longsword", name="Any sword"), "name may never be a row: Any sword"),
        (_set_item("longsword", name="[ERROR]Sword"), "name may never be a row: [ERROR]Sword"),
        (_set_item("longsword", name="any"), "name may never be a row: any"),
        (_set_item("claw_talisman", name="Claw"), "listed name has no row: Claw Talisman"),
        (_set_item("serpent_hunter", name="Spear"), "listed name has no row: Serpent-Hunter"),
    ],
)
def test_a_broken_table_is_a_quality_problem(
    gate_data: GateData, change: Change, message: str
) -> None:
    problems = quality_problems(replace(gate_data, database=change(gate_data.database)))
    assert any(message in problem for problem in problems), problems


def test_a_gap_with_no_override_is_a_quality_problem(gate_data: GateData) -> None:
    problems = quality_problems(replace(gate_data, override_items={}))
    assert any("answer it in requirements.csv" in problem for problem in problems)


def test_the_tables_hold_exactly_the_documented_fields(gate_data: GateData) -> None:
    rows = database_rows(gate_data.database)
    assert set(rows) == set(TABLE_FIELDS)
    for table, fields in TABLE_FIELDS.items():
        assert rows[table]
        assert all(tuple(row) == fields for row in rows[table])


def test_a_modifier_writes_both_kinds_of_condition(gate_data: GateData) -> None:
    rows = {str(row["id"]): row for row in database_rows(gate_data.database)["modifier"]}
    assert rows["jester_none_x33"]["when"] == [{"kind": "character_class", "ids": ["jester"]}]
    assert rows["l2_only_needs_a_skill_not_empty"]["when"] == [
        {
            "kind": "rolled",
            "slots": ["rh"],
            "selector": {"kind": "category", "ids": ["none"]},
            "negated": False,
        }
    ]


def test_whole_odds_read_as_whole_numbers(gate_data: GateData) -> None:
    rows = {str(row["id"]): row for row in database_rows(gate_data.database)["character_class"]}
    assert rows["knight"]["odds"] == 1
    assert isinstance(rows["knight"]["odds"], int)


def test_render_is_json_with_a_row_on_a_line() -> None:
    text = render({"a": [{"x": 1}, {"x": "é"}], "b": {"y": 2}, "c": []})
    assert json.loads(text) == {"a": [{"x": 1}, {"x": "é"}], "b": {"y": 2}, "c": []}
    assert '{"x": "é"}' in text.splitlines()


def test_the_report_names_where_a_dropped_value_came_from(gate_data: GateData) -> None:
    report = import_report(gate_data)
    dropped = cast("list[dict[str, object]]", report["dropped"])
    assert dropped
    assert all(set(row) == {"file", "key", "value", "count"} for row in dropped)
    assert any(str(row["value"]).startswith("[ERROR]") for row in dropped)
    slots = [row for row in dropped if row["file"] == "placement/item_slots.yaml"]
    assert all(str(row["key"]).startswith("Slots[") for row in slots)
    assert any(row["file"] == "placement/enemy_item_lots.csv" for row in dropped)


def test_a_pool_item_named_on_a_slot_is_not_dropped(gate_data: GateData) -> None:
    dropped = {row.value for row in gate_data.dropped if row.file == "placement/item_slots.yaml"}
    assert "Bloodhound's Fang" not in dropped
    assert "Smithing Stone [1]" in dropped


def test_main_writes_both_files_with_no_timestamp_or_path(
    gate_data: GateData, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(build_database, "load_gate_data", _loaded(gate_data))
    assert main(["--out", str(tmp_path)]) == 0
    text = (tmp_path / "db.json").read_text(encoding="utf-8")
    assert set(json.loads(text)) == set(TABLE_FIELDS)
    assert str(ROOT) not in text
    assert "builtAt" not in text
    assert (tmp_path / "import-report.json").exists()


def test_main_fails_and_writes_nothing_on_a_problem(
    gate_data: GateData,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def broken(_: GateData) -> tuple[str, ...]:
        return ("something broke",)

    monkeypatch.setattr(build_database, "load_gate_data", _loaded(gate_data))
    monkeypatch.setattr(build_database, "structure_problems", broken)
    assert main(["--out", str(tmp_path)]) == 1
    assert list(tmp_path.iterdir()) == []
    assert "something broke" in capsys.readouterr().err


def test_main_fails_when_a_source_cannot_be_built(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def fail(_: Path) -> GateData:
        raise BuildError("no such boss")

    monkeypatch.setattr(build_database, "load_gate_data", fail)
    assert main(["--out", str(tmp_path)]) == 1
    assert list(tmp_path.iterdir()) == []
    assert "no such boss" in capsys.readouterr().err


def _loaded(data: GateData) -> Callable[[Path], GateData]:
    return lambda _: data


def _run_build(folder: Path, seed: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "eldenroll.build.database", "--out", str(folder)],
        check=True,
        cwd=PIPELINE,
        env={**os.environ, "PYTHONHASHSEED": seed},
        capture_output=True,
    )


def test_two_runs_give_the_same_bytes_whatever_the_hash_seed(tmp_path: Path) -> None:
    _run_build(tmp_path / "first", "1")
    _run_build(tmp_path / "second", "2")
    for name in ("db.json", "import-report.json"):
        first = (tmp_path / "first" / name).read_bytes()
        assert first == (tmp_path / "second" / name).read_bytes(), name
