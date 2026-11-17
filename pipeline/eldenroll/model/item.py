"""Two requirement names in `db.json`, `str` and `int`, are Python builtins that the other
annotations here need, so the attributes carry a `req_` prefix and `to_row` restores the stored
names.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Category = Literal[
    "weapon",
    "shield",
    "armor",
    "talisman",
    "ash",
    "sorcery",
    "incantation",
    "tool",
    "consumable",
    "none",
]


@dataclass(frozen=True, slots=True)
class Item:
    """One rollable item; only the fields declared here exist, so nothing else can ship."""

    id: str
    name: str
    category: Category
    subcategory: str | None
    infusable: bool | None
    str_bonus_2h: bool | None
    alias: str | None
    image: str | None
    req_str: int
    req_dex: int
    req_int: int
    req_fth: int
    req_arc: int
    odds: float = 1
    url: str | None = None

    def to_row(self) -> dict[str, object]:
        """Return the row as stored in `db.json`, in `model/` field order."""
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "subcategory": self.subcategory,
            "infusable": self.infusable,
            "str_bonus_2h": self.str_bonus_2h,
            "alias": self.alias,
            "image": self.image,
            "str": self.req_str,
            "dex": self.req_dex,
            "int": self.req_int,
            "fth": self.req_fth,
            "arc": self.req_arc,
            "odds": self.odds,
            "url": self.url,
        }
