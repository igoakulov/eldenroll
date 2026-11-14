"""`Area.req` is a boolean expression over areas, events, key items and switches. It is kept
verbatim and never evaluated: the database stores where a thing is, not how it is reached.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Area:
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
        return "dlc" in self.tags


@dataclass(frozen=True, slots=True)
class GameEvent:
    name: str
    req: str
    text: str | None


@dataclass(frozen=True, slots=True)
class AnnotationConfig:
    areas: tuple[Area, ...]
    events: tuple[GameEvent, ...]

    def area_by_name(self) -> dict[str, Area]:
        return {area.name: area for area in self.areas}
