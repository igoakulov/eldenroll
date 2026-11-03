"""One build row, and one slot's pool for one build (`prd.md` §6.1, §6.2)."""

from __future__ import annotations

from dataclasses import dataclass

from eldenrando.model.selector import Selector


@dataclass(frozen=True, slots=True)
class Build:
    """One of the 7 builds, rolled by its base odds."""

    id: str
    name: str
    odds: float = 1


@dataclass(frozen=True, slots=True)
class SlotPool:
    """What one slot can roll for one build; the selectors carry the whole pool."""

    build_id: str
    slot: str
    selectors: tuple[Selector, ...]
