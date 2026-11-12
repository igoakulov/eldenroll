from __future__ import annotations

from collections.abc import Iterable, Mapping

from eldenroll.errors import BuildError
from eldenroll.loaders.modifiers import CHARACTER_CLASS_SUBJECT, ConditionRow, ModifierRow
from eldenroll.model.boss_instance import BossInstance
from eldenroll.model.modifier import CharacterClassCondition, Condition, Modifier, RolledCondition
from eldenroll.model.vocabulary import CHARACTER_CLASSES, SLOTS
from eldenroll.normalize.selectors import new_selector

BOSS_SUBJECT = "boss"


def build_modifiers(
    rows: Iterable[ModifierRow], bosses_of_region: Mapping[str, Iterable[str]] | None = None
) -> tuple[Modifier, ...]:
    regions = bosses_of_region or {}
    return tuple(
        Modifier(
            id=row.id,
            when=tuple(_condition(one, row.id, regions) for one in row.when),
            target=new_selector(*row.target),
            value=row.value,
        )
        for row in rows
    )


def _condition(
    row: ConditionRow, modifier_id: str, bosses_of_region: Mapping[str, Iterable[str]]
) -> Condition:
    if row.subject == CHARACTER_CLASS_SUBJECT:
        unknown = sorted(set(row.ids) - set(CHARACTER_CLASSES))
        if unknown or not row.ids:
            raise BuildError(f"{modifier_id}: bad character class condition: {', '.join(unknown)}")
        return CharacterClassCondition(row.ids)
    if row.subject == BOSS_SUBJECT:
        if row.kind != "boss":
            raise BuildError(f"{modifier_id}: a boss condition needs a boss selector")
        # A region id stands for its bosses (`data/overrides/README.md#Selectors and modifiers`)
        ids = [boss for one in row.ids for boss in bosses_of_region.get(one, (one,))]
        return RolledCondition(row.subject, new_selector(row.kind, ids), row.negated)
    if row.subject not in SLOTS:
        raise BuildError(f"{modifier_id}: unknown slot {row.subject}")
    return RolledCondition(row.subject, new_selector(row.kind, row.ids), row.negated)


def bosses_of_region(
    bosses: Iterable[BossInstance], region_of_location: Mapping[str, str]
) -> dict[str, tuple[str, ...]]:
    grouped: dict[str, list[str]] = {}
    for boss in bosses:
        grouped.setdefault(region_of_location[boss.location_id], []).append(boss.id)
    return {region: tuple(ids) for region, ids in grouped.items()}
