from __future__ import annotations

from collections.abc import Iterable

from eldenrando.loaders.builds import SlotPoolRow
from eldenrando.model.build import SlotPool
from eldenrando.normalize.selectors import new_selector


def build_slot_pools(rows: Iterable[SlotPoolRow]) -> tuple[SlotPool, ...]:
    return tuple(
        SlotPool(
            build_id=row.build_id,
            slot=row.slot,
            selectors=tuple(new_selector(kind, ids) for kind, ids in row.selectors),
        )
        for row in rows
    )
