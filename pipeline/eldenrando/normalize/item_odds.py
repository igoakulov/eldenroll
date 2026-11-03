"""Set `item.odds`: an item's base odds, 1 unless `item_odds.csv` says otherwise.

Odds 0 keeps a row that never rolls, such as a transform that conflicts with armor. Modifiers apply
on top, and only under their conditions (`prd.md` §8.2, §8.4).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.model.item import Item


def assign_item_odds(items: Iterable[Item], overrides: Mapping[str, float]) -> tuple[Item, ...]:
    """Return the rows with their base odds, or raise `BuildError` on an unknown id."""
    rows = tuple(items)
    unknown = sorted(set(overrides) - {row.id for row in rows})
    if unknown:
        raise BuildError(f"item_odds names no item: {', '.join(unknown)}")
    return tuple(
        replace(row, odds=overrides[row.id]) if row.id in overrides else row for row in rows
    )
