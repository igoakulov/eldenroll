"""One place an item can be found (`data.md` §5.2).

The null pattern says which case a row is, so no `source` column exists: a location for a pickup,
a shop or a regular enemy, and a boss instance for what comes from a fight.
"""

from __future__ import annotations

from dataclasses import dataclass

from eldenrando.errors import BuildError


@dataclass(frozen=True, slots=True)
class ItemLocation:
    """One row; exactly one of `location_id` and `boss_instance_id` is set."""

    item_id: str
    location_id: str | None = None
    boss_instance_id: str | None = None

    def __post_init__(self) -> None:
        if (self.location_id is None) == (self.boss_instance_id is None):
            raise BuildError(f"{self.item_id!r} needs exactly one of a location and a boss")
