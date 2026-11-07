from __future__ import annotations

from collections.abc import Iterable

from eldenrando.loaders.character_classes import SlotPoolRow
from eldenrando.model.character_class import SlotPool
from eldenrando.normalize.selectors import new_selector


def build_slot_pools(rows: Iterable[SlotPoolRow]) -> tuple[SlotPool, ...]:
    return tuple(
        SlotPool(
            character_class_id=row.character_class_id,
            slot=row.slot,
            selectors=tuple(new_selector(kind, ids) for kind, ids in row.selectors),
        )
        for row in rows
    )
