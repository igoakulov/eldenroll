from __future__ import annotations

from collections.abc import Iterable, Mapping
from collections.abc import Set as AbstractSet

from eldenrando.errors import BuildError
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.boss_instance import BossInstance
from eldenrando.model.item import Item
from eldenrando.model.selector import Selector, SelectorKind
from eldenrando.model.vocabulary import SLOTS


def known_ids(
    items: Iterable[Item],
    armor_sets: Iterable[ArmorSet],
    bosses: Iterable[BossInstance],
    rules: Iterable[str],
) -> Mapping[SelectorKind, AbstractSet[str]]:
    """Return what each kind can match; a class or category with no item matches nothing."""
    rows = tuple(items)
    return {
        "item": {row.id for row in rows},
        "subcategory": {row.subcategory for row in rows if row.subcategory is not None},
        "category": {row.category for row in rows},
        "rule": set(rules),
        "armor_set": {row.id for row in armor_sets},
        "slot": set(SLOTS),
        "boss": {row.id for row in bosses},
    }


def validate_selectors(
    selectors: Iterable[Selector], known: Mapping[SelectorKind, AbstractSet[str]]
) -> None:
    bad = sorted({entry for selector in selectors for entry in _unmatched(selector, known)})
    if bad:
        raise BuildError(f"selector matches nothing: {', '.join(bad)}")


def validate_modifier_target(selector: Selector) -> None:
    """Raise on a boss target: a boss's odds are its own column, so it only works as a condition."""
    if selector.kind == "boss":
        raise BuildError(f"a boss cannot be a modifier target: {selector.ids}")


def resolve_items(selectors: Iterable[Selector], items: Iterable[Item]) -> tuple[Item, ...]:
    """Return the items any selector matches, in table order; odds play no part."""
    rows = tuple(selectors)
    return tuple(item for item in items if any(_matches(row, item) for row in rows))


def _matches(selector: Selector, item: Item) -> bool:
    """Return whether a selector picks an item; `none` needs its category or id named."""
    ids = selector.ids
    if selector.kind == "item":
        return item.category != "none" if ids is None else item.id in ids
    if selector.kind == "category":
        return item.category != "none" if ids is None else item.category in ids
    if selector.kind == "subcategory":
        return item.subcategory is not None and (ids is None or item.subcategory in ids)
    return False


def _unmatched(
    selector: Selector, known: Mapping[SelectorKind, AbstractSet[str]]
) -> tuple[str, ...]:
    options = known[selector.kind]
    if selector.ids is None:
        return () if options else (f"{selector.kind}: every option",)
    return tuple(f"{selector.kind}: {one}" for one in selector.ids if one not in options)
