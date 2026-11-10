"""`region_level` is an ordering key only: it never filters and nothing is derived from its value.
The `DLC: ` prefix inside `name` is the only DLC marker; no `dlc` field is stored.
"""

from __future__ import annotations

from dataclasses import dataclass

DLC_PREFIX: str = "DLC: "
ROYAL_CAPITAL: str = "leyndell"
ASHEN_CAPITAL: str = "leyndell_ashen"
# Their rows stay in the Royal Capital's region, but both capitals reach them
# (`web/src/engine/README.md#Inputs`).
SHUNNING_GROUNDS: frozenset[str] = frozenset({"sewer", "sewer_flame", "sewer_catacombs"})


@dataclass(frozen=True, slots=True)
class Region:
    id: str
    name: str
    region_level: int

    @property
    def is_dlc(self) -> bool:
        return self.name.startswith(DLC_PREFIX)
