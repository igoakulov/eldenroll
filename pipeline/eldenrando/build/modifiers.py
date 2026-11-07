from __future__ import annotations

from collections.abc import Iterable

from eldenrando.errors import BuildError
from eldenrando.loaders.modifiers import CHARACTER_CLASS_SUBJECT, ConditionRow, ModifierRow
from eldenrando.model.modifier import CharacterClassCondition, Condition, Modifier, RolledCondition
from eldenrando.model.vocabulary import CHARACTER_CLASSES, SLOTS
from eldenrando.normalize.selectors import new_selector


def build_modifiers(rows: Iterable[ModifierRow]) -> tuple[Modifier, ...]:
    return tuple(
        Modifier(
            id=row.id,
            when=tuple(_condition(one, row.id) for one in row.when),
            target=new_selector(*row.target),
            value=row.value,
        )
        for row in rows
    )


def _condition(row: ConditionRow, modifier_id: str) -> Condition:
    if row.subject == CHARACTER_CLASS_SUBJECT:
        unknown = sorted(set(row.ids) - set(CHARACTER_CLASSES))
        if unknown or not row.ids:
            raise BuildError(f"{modifier_id}: bad character class condition: {', '.join(unknown)}")
        return CharacterClassCondition(row.ids)
    if row.subject not in SLOTS:
        raise BuildError(f"{modifier_id}: unknown slot {row.subject}")
    return RolledCondition(row.subject, new_selector(row.kind, row.ids), row.negated)
