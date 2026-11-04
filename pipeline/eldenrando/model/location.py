"""`id` is the annotation area name, because that is the unit the randomizer's slot data uses.
`name` is the area's display text and may repeat; ids never do.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Location:
    """One selectable location; every location belongs to exactly one region."""

    id: str
    name: str
    region_id: str
