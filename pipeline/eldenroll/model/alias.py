"""A display label over concrete items, never a sampling unit
(`web/src/engine/README.md#Empty slots and aliases`).

Membership is on the item, as `item.alias`, so a label is all this row holds.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Alias:
    id: str
    label: str
    url: str | None = None
