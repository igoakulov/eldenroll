"""Areas and events from `annotations_stable.txt`.

The file is the randomizer's whole configuration. Only two sections are modelled here:
`Areas` (the 174 canonical areas) and `Events` (46 named progression events, 42 of which
are bosses). The rest is read by later stages.

`Area.req` is a boolean expression over areas, events, key items and switches. It is kept
verbatim and never evaluated: the database stores where a thing is, not how it is reached.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Area:
    """One canonical area: the unit that drives region grouping."""

    name: str
    text: str
    req: str | None
    maps: tuple[str, ...]
    main_maps: tuple[str, ...]
    tags: tuple[str, ...]
    until: str | None
    comment: str | None
    map_names: tuple[str, ...]

    @property
    def is_dlc(self) -> bool:
        """Return whether the area belongs to the Shadow of the Erdtree map set."""
        return "dlc" in self.tags


@dataclass(frozen=True, slots=True)
class GameEvent:
    """One named progression event; the boss events name a boss and the area it is fought in."""

    name: str
    req: str
    text: str | None


@dataclass(frozen=True, slots=True)
class AnnotationConfig:
    """The modelled sections of `annotations_stable.txt`."""

    areas: tuple[Area, ...]
    events: tuple[GameEvent, ...]

    def area_by_name(self) -> dict[str, Area]:
        """Return areas keyed by canonical name."""
        return {area.name: area for area in self.areas}

    def event_by_name(self) -> dict[str, GameEvent]:
        """Return events keyed by name."""
        return {event.name: event for event in self.events}
