from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Iterator, Mapping
from collections.abc import Set as AbstractSet

from eldenroll.errors import BuildError
from eldenroll.model.character_class import SlotPool
from eldenroll.model.item import Item
from eldenroll.model.modifier import CharacterClassCondition, Modifier, RolledCondition
from eldenroll.model.selector import Selector, SelectorKind
from eldenroll.model.vocabulary import CHARACTER_CLASSES, SLOTS
from eldenroll.validate.selectors import (
    resolve_items,
    validate_modifier_target,
    validate_selectors,
)

RULE_SLOT = "rule"
ITEM_KINDS: frozenset[SelectorKind] = frozenset({"item", "subcategory", "category"})


def validate_modifiers(
    modifiers: Iterable[Modifier], known: Mapping[SelectorKind, AbstractSet[str]]
) -> None:
    rows = tuple(modifiers)
    counts = Counter(row.id for row in rows)
    problems = [f"{name} repeats" for name, count in counts.items() if count > 1]
    problems += [f"{row.id} has no condition" for row in rows if not row.when]
    problems += [f"{row.id} targets a rule before its condition" for row in rows if _late(row)]
    if problems:
        raise BuildError(f"bad modifiers: {'; '.join(problems)}")
    for row in rows:
        validate_modifier_target(row.target)
    validate_selectors(_selectors(rows), known)


def validate_rolling_order(
    modifiers: Iterable[Modifier], pools: Iterable[SlotPool], items: Iterable[Item]
) -> None:
    table = tuple(items)
    resolved = {
        (pool.character_class_id, pool.slot): {
            one.id for one in resolve_items(pool.selectors, table)
        }
        for pool in pools
    }
    late = [row.id for row in modifiers if not _rolls_after_conditions(row, resolved, table)]
    if late:
        names = ", ".join(late)
        raise BuildError(f"modifiers target nothing rolled after their conditions: {names}")


def _rolls_after_conditions(
    row: Modifier, resolved: Mapping[tuple[str, str], AbstractSet[str]], table: tuple[Item, ...]
) -> bool:
    slots = [_earliest(one) for one in row.when if isinstance(one, RolledCondition)]
    if row.target.kind not in ITEM_KINDS or not slots:
        return True
    character_classes = set(CHARACTER_CLASSES)
    for one in row.when:
        if isinstance(one, CharacterClassCondition):
            character_classes &= set(one.character_classes)
    targets = {one.id for one in resolve_items((row.target,), table)}
    return any(
        targets & ids
        for (character_class, slot), ids in resolved.items()
        if character_class in character_classes and SLOTS.index(slot) > max(slots)
    )


def _earliest(condition: RolledCondition) -> int:
    """A condition can first hold at its earliest slot; the boss rolls before every slot."""
    return min(-1 if slot == "boss" else SLOTS.index(slot) for slot in condition.slots)


def _late(row: Modifier) -> bool:
    """Return whether a rule target rolls no later than one of its conditions."""
    if row.target.kind != "rule":
        return False
    return any(
        _earliest(one) >= SLOTS.index(RULE_SLOT)
        for one in row.when
        if isinstance(one, RolledCondition)
    )


def _selectors(rows: tuple[Modifier, ...]) -> Iterator[Selector]:
    for row in rows:
        yield row.target
        for one in row.when:
            if isinstance(one, RolledCondition):
                yield one.selector
