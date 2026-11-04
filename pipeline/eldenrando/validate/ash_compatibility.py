from __future__ import annotations

from collections.abc import Iterable

from eldenrando.model.ash_compatibility import AshCompatibility
from eldenrando.model.item import Item


def infusable_without_ashes(
    table: Iterable[Item], rows: Iterable[AshCompatibility]
) -> tuple[Item, ...]:
    fits = {(row.category, row.subcategory) for row in rows}
    return tuple(
        item
        for item in table
        if item.infusable
        and (item.category, item.subcategory) not in fits
        and (item.category, None) not in fits
    )
