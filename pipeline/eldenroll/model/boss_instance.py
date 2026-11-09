"""The region comes through `location_id`. `location_label` is the source spreadsheet's text, kept
only to build the id and match override rows; `location` is the short place the player sees.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BossInstance:
    """One fight; the boss slot can roll it only while `odds` is above 0."""

    id: str
    name: str
    location_id: str
    location_label: str
    odds: float = 1
    location: str = ""
