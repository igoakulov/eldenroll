from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Mapping
from collections.abc import Set as AbstractSet

from eldenrando.errors import BuildError
from eldenrando.model.build import SlotPool
from eldenrando.model.item import Item
from eldenrando.model.selector import SelectorKind
from eldenrando.model.vocabulary import (
    ASH_SLOTS,
    BUILD_ASH_SLOTS,
    BUILDS,
    CATALYST,
    SLOTS,
)
from eldenrando.validate.selectors import resolve_items, validate_selectors

RULE_SLOTS = frozenset({"rule_1", "rule_2"})
# The card shows `Any staff / seal`, so one staff is enough, and this one shares its region with
# `Spinning Weapon`, so the card always names the ash (`prd.md` §6.2).
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
    problems = [*_shape(rows), *_kinds(rows), *_scope(rows, table)]
    if problems:
        raise BuildError(f"bad slot pools: {'; '.join(problems)}")
    validate_selectors((one for row in rows for one in row.selectors), known)


def _shape(rows: tuple[SlotPool, ...]) -> list[str]:
    counts = Counter((row.build_id, row.slot) for row in rows)
    problems = [f"{build} {slot} repeats" for (build, slot), n in counts.items() if n > 1]
    for build in BUILDS:
        wanted = {slot for slot in SLOTS if slot not in ASH_SLOTS} | BUILD_ASH_SLOTS[build]
        found = {slot for (owner, slot) in counts if owner == build}
        problems += [f"{build} lacks {slot}" for slot in sorted(wanted - found)]
        problems += [f"{build} should not have {slot}" for slot in sorted(found - wanted)]
    problems += [f"{row.build_id} {row.slot} has no selector" for row in rows if not row.selectors]
    return problems


def _kinds(rows: tuple[SlotPool, ...]) -> list[str]:
    return [
        f"{row.build_id} {row.slot} selects by {one.kind}"
        for row in rows
        for one in row.selectors
        if one.kind not in ({"rule"} if row.slot in RULE_SLOTS else ITEM_KINDS)
    ]


def _scope(rows: tuple[SlotPool, ...], table: tuple[Item, ...]) -> list[str]:
    """Return each pool whose catalysts or odd weapons differ from what `prd.md` §6.2 allows."""
    catalysts = {item.id for item in table if item.subcategory in CATALYST}
    odd_weapons = {item.id for item in table if item.subcategory in SCOPED_ODD_WEAPONS}
    allowed_catalysts: Mapping[tuple[str, str], AbstractSet[str]] = {
        ("mage", "rh"): catalysts,
        ("mage", "lh"): catalysts,
        ("spellblade", "lh"): catalysts,
        ("jester", "rh"): {JESTER_STAFF},
    }
    problems: list[str] = []
    for row in rows:
        key = (row.build_id, row.slot)
        resolved = {item.id for item in resolve_items(row.selectors, table)}
        if resolved & catalysts != allowed_catalysts.get(key, set[str]()):
            problems.append(f"{row.build_id} {row.slot} has the wrong catalysts")
        if resolved & odd_weapons != (odd_weapons if key == ("jester", "rh") else set[str]()):
            problems.append(f"{row.build_id} {row.slot} has the wrong torches or perfume bottles")
    return problems
