"""Odds are for balancing, and 0 keeps a row that never rolls, such as a transform that conflicts
with armor. Modifiers apply on top, and only under their conditions (`prd.md` §8.2, §8.4). An
armor piece rolls only through its set, so odds on a piece would do nothing, and the build
refuses them.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.item import Item


def assign_item_odds(items: Iterable[Item], overrides: Mapping[str, float]) -> tuple[Item, ...]:
    rows = tuple(items)
    unknown = sorted(set(overrides) - {row.id for row in rows})
    if unknown:
        raise BuildError(f"item_odds names no item: {', '.join(unknown)}")
    pieces = sorted(row.id for row in rows if row.id in overrides and row.category == "armor")
    if pieces:
        raise BuildError(f"armor pieces roll through their set: {', '.join(pieces)}")
    return tuple(
        replace(row, odds=overrides[row.id]) if row.id in overrides else row for row in rows
    )


def assign_armor_set_odds(
    sets: Iterable[ArmorSet], overrides: Mapping[str, float]
) -> tuple[ArmorSet, ...]:
    rows = tuple(sets)
    unknown = sorted(set(overrides) - {row.id for row in rows})
    if unknown:
        raise BuildError(f"armor_set_odds names no set: {', '.join(unknown)}")
    return tuple(
        replace(row, odds=overrides[row.id]) if row.id in overrides else row for row in rows
    )
