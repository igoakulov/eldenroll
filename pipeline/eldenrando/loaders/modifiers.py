"""`when` holds conditions split by `;`: `rule_1=rule:parry_only` when a slot rolled a match,
`rh!=subcategory:melee` when it did not, and `build=mage jester` for the rolled build. `target`
is one selector in the `slot_pools.csv` form.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenrando.loaders.builds import parse_selector
from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.odds import parse_odds
from eldenrando.loaders.schema import LoaderError

BUILD_SUBJECT = "build"


@dataclass(frozen=True, slots=True)
class ConditionRow:
    """One condition, split but not yet normalized; a build condition has an empty `kind`."""

    subject: str
    negated: bool
    kind: str
    ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ModifierRow:
    id: str
    when: tuple[ConditionRow, ...]
    target: tuple[str, tuple[str, ...]]
    value: float


def load_modifiers(path: Path) -> tuple[ModifierRow, ...]:
    table = read_table(path, required_columns=("id", "when", "target", "value"))
    rows: list[ModifierRow] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        modifier_id = row[table.column("id")]
        if not modifier_id:
            raise LoaderError(f"{where}: empty id")
        rows.append(
            ModifierRow(
                id=modifier_id,
                when=_conditions(row[table.column("when")], where),
                target=parse_selector(row[table.column("target")], where),
                value=parse_odds(path, modifier_id, row[table.column("value")]),
            )
        )
    return tuple(rows)


def _conditions(cell: str, where: str) -> tuple[ConditionRow, ...]:
    """Return a cell's conditions; an empty cell has none, which validation rejects."""
    return tuple(
        _condition(part, where) for part in filter(None, (one.strip() for one in cell.split(";")))
    )


def _condition(part: str, where: str) -> ConditionRow:
    negated = "!=" in part
    subject, equals, rest = part.partition("!=" if negated else "=")
    if not equals:
        raise LoaderError(f"{where}: condition {part!r} has no operator")
    if subject != BUILD_SUBJECT:
        kind, ids = parse_selector(rest, where)
        return ConditionRow(subject, negated, kind, ids)
    if negated:
        raise LoaderError(f"{where}: condition {part!r} cannot negate a build")
    return ConditionRow(subject, False, "", tuple(rest.split()))
