"""One combat rule row (`prd.md` §7)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CombatRule:
    """One rule the two rule slots can roll, by its base odds."""

    id: str
    name: str
    description: str
    odds: float = 1
