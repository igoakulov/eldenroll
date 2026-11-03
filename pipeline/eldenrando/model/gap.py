"""One open data problem in `data/gaps.csv`, the single list of them.

A check finds some gaps and a person adds the rest, because a wrong value that looks normal is
something no check can see. `answer` may hold a proposal while the row is open. An answered row
says who settled it in `source`, and an applied row's value is in the override files, which are
all the build reads.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

Origin = Literal["base", "tarnished", "dlc", "mixed"]
FoundBy = Literal["check", "manual"]
Owner = Literal["agent", "owner", "both"]
Status = Literal["open", "answered", "applied"]

AREAS: Final[tuple[str, ...]] = (
    "requirements",
    "holds_ash",
    "ash_usable_on",
    "ash_sources",
    "class_ashes",
    "remembrance_boss",
    "boss_names",
    "boss_pool",
    "placement",
    "odds",
    "armor_slot",
    "paired_weapons",
    "armor_sets",
    "blue_dancer",
    "rot_poison_triggers",
    "rule_descriptions",
    "rule_conflicts",
    "aliases",
    "images",
)
ORIGINS: Final[tuple[Origin, ...]] = ("base", "tarnished", "dlc", "mixed")
FOUND_BY: Final[tuple[FoundBy, ...]] = ("check", "manual")
OWNERS: Final[tuple[Owner, ...]] = ("agent", "owner", "both")
STATUSES: Final[tuple[Status, ...]] = ("open", "answered", "applied")


@dataclass(frozen=True, slots=True)
class Gap:
    """A problem, who it waits on, and its answer once there is one."""

    area: str
    item: str
    origin: Origin
    problem: str
    found_by: FoundBy
    step: str
    owner: Owner
    status: Status = "open"
    answer: str = ""
    source: str = ""

    @property
    def key(self) -> tuple[str, str]:
        """Return what identifies the row: one problem per area and item."""
        return (self.area, self.item)
