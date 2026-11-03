"""Build the `alias` rows and set `item.alias` on their members (`prd.md` §6.7)."""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.loaders.aliases import AliasRow
from eldenrando.model.alias import Alias
from eldenrando.model.item import Item
from eldenrando.normalize.selectors import new_selector
from eldenrando.validate.selectors import known_ids, resolve_items, validate_selectors


def build_aliases(rows: Iterable[AliasRow]) -> tuple[Alias, ...]:
    """Return the alias rows; their members go on the items through `assign_aliases`."""
    return tuple(Alias(row.id, row.label) for row in rows)


def assign_aliases(items: Iterable[Item], rows: Iterable[AliasRow]) -> tuple[Item, ...]:
    """Return the items with their alias, or raise `BuildError` on an unknown or shared member."""
    table = tuple(items)
    known = known_ids(table, (), (), ())
    member_of: dict[str, str] = {}
    shared: Counter[str] = Counter()
    for row in rows:
        selectors = tuple(new_selector(kind, ids) for kind, ids in row.members)
        validate_selectors(selectors, known)
        for item in resolve_items(selectors, table):
            shared[item.id] += 1
            member_of[item.id] = row.id
    repeated = sorted(item_id for item_id, count in shared.items() if count > 1)
    if repeated:
        raise BuildError(f"item in several aliases: {', '.join(repeated)}")
    return tuple(replace(item, alias=member_of.get(item.id)) for item in table)
