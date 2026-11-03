"""One alias row: a display label over concrete items, never a sampling unit (`prd.md` §6.7).

Membership is on the item, as `item.alias`, so a label is all this row holds.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Alias:
    """A label the engine shows in place of the concrete item it rolled."""

    id: str
    label: str
