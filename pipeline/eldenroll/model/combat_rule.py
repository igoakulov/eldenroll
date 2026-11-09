from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CombatRule:
    id: str
    name: str
    odds: float = 1
