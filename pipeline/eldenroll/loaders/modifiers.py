"""`when` holds conditions split by `;`: `rule=rule:parry_only` when a slot rolled a match,
`rh|lh=item:x` when either did, `rh!=subcategory:melee` when it did not, and
`character_class=sorcerer jester` for the rolled character class. `target` is one selector in the
`slot_pools.csv` form.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenroll.loaders.character_classes import parse_selector
from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.odds import parse_odds
from eldenroll.loaders.schema import LoaderError

CHARACTER_CLASS_SUBJECT = "character_class"


@dataclass(frozen=True, slots=True)
class ConditionRow:
    """One condition, split but not yet normalized; a character class condition has no `kind`."""

    subjects: tuple[str, ...]
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
    subjects = tuple(one.strip() for one in subject.split("|"))
    if len(subjects) > 1 and (negated or CHARACTER_CLASS_SUBJECT in subjects):
        raise LoaderError(f"{where}: condition {part!r} lists slots for a match only")
    if len(set(subjects)) < len(subjects):
        raise LoaderError(f"{where}: condition {part!r} repeats a slot")
    if subjects != (CHARACTER_CLASS_SUBJECT,):
        kind, ids = parse_selector(rest, where)
        return ConditionRow(subjects, negated, kind, ids)
    if negated:
        raise LoaderError(f"{where}: condition {part!r} cannot negate a character class")
    return ConditionRow(subjects, False, "", tuple(rest.split()))
