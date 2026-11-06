from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Iterator, Mapping
from typing import Final

from eldenrando.build.ashes import EXCLUDED as EXCLUDED_ASHES
from eldenrando.build.consumables import NAMED_THROWABLES, NOT_AN_ITEM
from eldenrando.build.items import never_a_row
from eldenrando.build.spells import EXCLUDED_INCANTATIONS, EXCLUDED_SORCERIES
from eldenrando.build.talismans import SHORTLIST
from eldenrando.build.tools import TOOLS, TRANSFORMS
from eldenrando.loaders.aliases import AliasRow
from eldenrando.model.database import Database
from eldenrando.model.item import Item
from eldenrando.model.item_slot import ItemSlot
from eldenrando.validate.gaps import find_gaps, reconcile
from eldenrando.validate.gate_data import GateData

POOL_COUNTS: Final[Mapping[str, int]] = {
    "weapon": 409,
    "shield": 78,
    "armor": 639,
    "talisman": 41,
    "ash": 111,
    "sorcery": 67,
    "incantation": 86,
    "tool": 9,
    "consumable": 81,
    "none": 1,
}
LOCATION_COUNT: Final[int] = 174
SLOT_COUNT: Final[int] = 4379
IGNORED_SLOTS: Final[int] = 122
EXCLUDED: Final[Mapping[str, frozenset[str]]] = {
    "ash": EXCLUDED_ASHES,
    "sorcery": EXCLUDED_SORCERIES,
    "incantation": EXCLUDED_INCANTATIONS,
    "consumable": frozenset({NOT_AN_ITEM}),
    "tool": frozenset({NOT_AN_ITEM}),
}
ALIAS_MEMBER_KINDS: Final[frozenset[str]] = frozenset({"item", "subcategory", "category"})


def quality_problems(data: GateData) -> tuple[str, ...]:
    """Return every data-quality problem; an empty result means this half of the gate holds."""
    database = data.database
    return (
        *_repeated_names(database.items),
        *_pool_counts(database.items),
        *_slot_counts(database, data.sources.slots),
        *_excluded(database.items),
        *_listed(database.items, data.added_items),
        *_alias_members(data.alias_rows),
        *_never_a_row(database.items),
        *reconcile(find_gaps(data.sources), data.gaps, data.override_items),
    )


def _repeated_names(items: Iterable[Item]) -> Iterator[str]:
    counts = Counter((item.category, item.name) for item in items)
    repeated = sorted(f"{name} ({category})" for (category, name), n in counts.items() if n > 1)
    if repeated:
        yield f"name repeats within a category: {', '.join(repeated)}"


def _pool_counts(items: Iterable[Item]) -> Iterator[str]:
    counts = Counter(item.category for item in items)
    for category in sorted(set(POOL_COUNTS) | set(counts)):
        if counts[category] != POOL_COUNTS.get(category, 0):
            yield f"{counts[category]} {category} rows, expected {POOL_COUNTS.get(category, 0)}"


def _slot_counts(database: Database, slots: Iterable[ItemSlot]) -> Iterator[str]:
    rows = tuple(slots)
    ignored = sum(1 for slot in rows if not slot.is_randomizable)
    if len(database.locations) != LOCATION_COUNT:
        yield f"{len(database.locations)} locations, expected {LOCATION_COUNT}"
    if (len(rows), ignored) != (SLOT_COUNT, IGNORED_SLOTS):
        yield f"{len(rows)} slots with {ignored} ignored, expected {SLOT_COUNT} and {IGNORED_SLOTS}"


def _excluded(items: Iterable[Item]) -> Iterator[str]:
    found = sorted(
        f"{item.name} ({item.category})"
        for item in items
        if item.name in EXCLUDED.get(item.category, frozenset[str]())
    )
    if found:
        yield f"excluded name has a row: {', '.join(found)}"


def _listed(items: Iterable[Item], added: Iterable[str]) -> Iterator[str]:
    names: dict[str, set[str]] = {}
    for item in items:
        names.setdefault(item.category, set()).add(item.name)
    lists: tuple[tuple[str, Iterable[str]], ...] = (
        ("talisman", SHORTLIST),
        ("tool", (*TOOLS, *TRANSFORMS)),
        ("consumable", NAMED_THROWABLES),
        ("weapon", added),
    )
    missing = sorted(
        f"{name} ({category})"
        for category, listed in lists
        for name in listed
        if name not in names.get(category, set())
    )
    if missing:
        yield f"listed name has no row: {', '.join(missing)}"


def _alias_members(rows: Iterable[AliasRow]) -> Iterator[str]:
    """Yield each alias whose members are not selectors, because no alias matches on a name."""
    bad = sorted(
        row.id for row in rows if any(kind not in ALIAS_MEMBER_KINDS for kind, _ in row.members)
    )
    if bad:
        yield f"alias members are not items, classes or categories: {', '.join(bad)}"


def _never_a_row(items: Iterable[Item]) -> Iterator[str]:
    found = never_a_row(items)
    if found:
        yield f"name may never be a row: {', '.join(found)}"
