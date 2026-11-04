"""This is a fact about the single item, apart from which ashes fit its class (`data.md` §4.5). In
order: `infusable.csv` decides, then a class that never holds one, then a unique skill means no,
and anything else can. Every other category keeps its null.
"""

from __future__ import annotations

from collections.abc import Collection, Iterable, Mapping
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.model.item import Item
from eldenrando.model.vocabulary import NEVER_INFUSABLE


def assign_infusable(
    items: Iterable[Item], unique_skill: Collection[str], overrides: Mapping[str, bool]
) -> tuple[Item, ...]:
    rows = tuple(items)
    weapons = {row.name for row in rows if row.category in ("weapon", "shield")}
    unknown = sorted((set(overrides) | set(unique_skill)) - weapons)
    if unknown:
        raise BuildError(f"infusable source(s) name no weapon: {', '.join(unknown)}")
    return tuple(
        replace(row, infusable=_infusable(row, unique_skill, overrides))
        if row.category in ("weapon", "shield")
        else row
        for row in rows
    )


def _infusable(row: Item, unique_skill: Collection[str], overrides: Mapping[str, bool]) -> bool:
    override = overrides.get(row.name)
    if override is not None:
        return override
    return row.subcategory not in NEVER_INFUSABLE and row.name not in unique_skill
