from __future__ import annotations

from dataclasses import dataclass

from eldenrando.model.selector import Selector


@dataclass(frozen=True, slots=True)
class Build:
    id: str
    name: str
    odds: float = 1


@dataclass(frozen=True, slots=True)
class SlotPool:
    """What one slot can roll for one build; the selectors carry the whole pool."""

    build_id: str
    slot: str
    selectors: tuple[Selector, ...]
