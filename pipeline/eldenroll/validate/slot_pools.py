from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Mapping
from collections.abc import Set as AbstractSet

from eldenroll.errors import BuildError
from eldenroll.model.character_class import SlotPool
from eldenroll.model.item import Item
from eldenroll.model.selector import SelectorKind
from eldenroll.model.vocabulary import (
    ASH_SLOTS,
    CATALYST,
    CHARACTER_CLASS_ASH_SLOTS,
    CHARACTER_CLASSES,
    SLOTS,
)
from eldenroll.validate.selectors import resolve_items, validate_selectors

RULE_SLOTS = frozenset({"rule_1", "rule_2"})
# The card shows `Any staff`, so one staff is enough, and this one shares its region with
# `Spinning Weapon`, so the card always names the ash (`web/src/engine/README.md#Classes`).
JESTER_STAFF = "demi_human_queens_staff"
SCOPED_ODD_WEAPONS = frozenset({"torch", "perfume_bottle"})
ITEM_KINDS: frozenset[SelectorKind] = frozenset({"item", "subcategory", "category"})


def validate_slot_pools(
    pools: Iterable[SlotPool],
    items: Iterable[Item],
    known: Mapping[SelectorKind, AbstractSet[str]],
) -> None:
    rows = tuple(pools)
    table = tuple(items)
    bosses = known.get("boss", frozenset[str]())
    problems = [
        *_shape(rows),
        *_kinds(rows),
        *_scope(rows, table),
        *(
            f"{row.character_class_id} {row.slot} is opened by an unknown boss {row.opened_by}"
            for row in rows
            if row.opened_by is not None and row.opened_by not in bosses
        ),
    ]
    if problems:
        raise BuildError(f"bad slot pools: {'; '.join(problems)}")
    validate_selectors((one for row in rows for one in row.selectors), known)


def _shape(rows: tuple[SlotPool, ...]) -> list[str]:
    counts = Counter((row.character_class_id, row.slot) for row in rows)
    problems = [
        f"{character_class} {slot} repeats"
        for (character_class, slot), n in counts.items()
        if n > 1
    ]
    for character_class in CHARACTER_CLASSES:
        wanted = {slot for slot in SLOTS if slot not in ASH_SLOTS} | CHARACTER_CLASS_ASH_SLOTS[
            character_class
        ]
        found = {slot for (owner, slot) in counts if owner == character_class}
        problems += [f"{character_class} lacks {slot}" for slot in sorted(wanted - found)]
        problems += [f"{character_class} should not have {slot}" for slot in sorted(found - wanted)]
    problems += [
        f"{row.character_class_id} {row.slot} has no selector" for row in rows if not row.selectors
    ]
    return problems


def _kinds(rows: tuple[SlotPool, ...]) -> list[str]:
    return [
        f"{row.character_class_id} {row.slot} selects by {one.kind}"
        for row in rows
        for one in row.selectors
        if one.kind not in ({"rule"} if row.slot in RULE_SLOTS else ITEM_KINDS)
    ]


def _scope(rows: tuple[SlotPool, ...], table: tuple[Item, ...]) -> list[str]:
    """Return each pool whose catalysts or odd weapons differ from what
    `web/src/engine/README.md#Classes` allows."""
    catalysts = {item.id for item in table if item.subcategory in CATALYST}
    staves = {item.id for item in table if item.subcategory == "glintstone_staff"}
    seals = catalysts - staves
    odd_weapons = {item.id for item in table if item.subcategory in SCOPED_ODD_WEAPONS}
    allowed_catalysts: Mapping[tuple[str, str], AbstractSet[str]] = {
        ("sorcerer", "rh"): staves,
        ("sorcerer", "lh"): staves,
        ("pyromancer", "rh"): seals,
        ("pyromancer", "lh"): seals,
        ("spellblade", "lh"): catalysts,
        ("jester", "rh"): {JESTER_STAFF},
    }
    problems: list[str] = []
    for row in rows:
        key = (row.character_class_id, row.slot)
        resolved = {item.id for item in resolve_items(row.selectors, table)}
        if resolved & catalysts != allowed_catalysts.get(key, set[str]()):
            problems.append(f"{row.character_class_id} {row.slot} has the wrong catalysts")
        if resolved & odd_weapons != (odd_weapons if key == ("jester", "rh") else set[str]()):
            problems.append(
                f"{row.character_class_id} {row.slot} has the wrong torches or perfume bottles"
            )
    return problems
