"""`region_level` is an ordering key only: it never filters and nothing is derived from its value.
The `DLC: ` prefix inside `name` is the only DLC marker; no `dlc` field is stored.
"""

from __future__ import annotations

from dataclasses import dataclass

DLC_PREFIX: str = "DLC: "


@dataclass(frozen=True, slots=True)
class Region:
    id: str
    name: str
    region_level: int

    @property
    def is_dlc(self) -> bool:
        return self.name.startswith(DLC_PREFIX)
