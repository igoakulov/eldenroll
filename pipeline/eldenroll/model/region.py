"""`region_level` is an ordering key only: it never filters and nothing is derived from its value.
`run_left` is the share of a typical run still ahead when the region opens, for the catch-up boost
(`data/balance.md#Hyperparameters`).
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
    run_left: float

    @property
    def is_dlc(self) -> bool:
        return self.name.startswith(DLC_PREFIX)
