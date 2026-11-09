from __future__ import annotations

from dataclasses import dataclass

from eldenroll.model.selector import Selector


@dataclass(frozen=True, slots=True)
class CharacterClass:
    id: str
    name: str
    odds: float = 1


@dataclass(frozen=True, slots=True)
class SlotPool:
    """What one slot can roll for one character class; the selectors carry the whole pool."""

    character_class_id: str
    slot: str
    selectors: tuple[Selector, ...]
