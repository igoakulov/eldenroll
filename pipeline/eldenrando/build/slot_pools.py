"""Build the `slot_pool` rows, with each selector in its stored form (`data.md` §2.1)."""

from __future__ import annotations

from collections.abc import Iterable

from eldenrando.loaders.builds import SlotPoolRow
from eldenrando.model.build import SlotPool
from eldenrando.normalize.selectors import new_selector


def build_slot_pools(rows: Iterable[SlotPoolRow]) -> tuple[SlotPool, ...]:
    """Return the pools in source order, or raise `BuildError` on an unknown selector kind."""
    return tuple(
        SlotPool(
            build_id=row.build_id,
            slot=row.slot,
            selectors=tuple(new_selector(kind, ids) for kind, ids in row.selectors),
        )
        for row in rows
    )
