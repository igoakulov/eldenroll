"""One boss instance: one fight at one place, killed independently of any other (`data.md` §6).

The region comes through `location_id`, and the display is derived from the name and the label,
so neither is stored.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BossInstance:
    """One fight the boss slot can roll."""

    id: str
    name: str
    location_id: str
    location_label: str
