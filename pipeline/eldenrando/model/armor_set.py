"""A piece's slot comes from its `item.subcategory`, so the set does not store it."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ArmorSet:
    """One set; `pieces` holds 0 to 4 item ids, at most one per slot, in slot order."""

    id: str
    name: str
    pieces: tuple[str, ...]
    odds: float = 1
