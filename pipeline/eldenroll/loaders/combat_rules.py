from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.odds import parse_odds
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.combat_rule import CombatRule
from eldenroll.normalize.slug import slugify

COLUMNS: tuple[str, ...] = ("id", "name", "odds")


def load_combat_rules(path: Path) -> tuple[CombatRule, ...]:
    table = read_table(path, required_columns=COLUMNS)
    rules: list[CombatRule] = []
    seen: set[str] = set()
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in COLUMNS:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        rule_id = row[table.column("id")]
        rule_name = row[table.column("name")]
        if rule_id != slugify(rule_name):
            raise LoaderError(f"{where}: id {rule_id!r} is not the slug of {rule_name!r}")
        if rule_id in seen:
            raise LoaderError(f"{path}: duplicate rule id {rule_id!r}")
        seen.add(rule_id)
        rules.append(
            CombatRule(
                id=rule_id,
                name=rule_name,
                odds=parse_odds(path, rule_id, row[table.column("odds")]),
            )
        )
    return tuple(rules)
