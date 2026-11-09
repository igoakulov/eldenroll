"""A place's name from the mod reads `Area - Place` or names the area alone. `location_display.csv`
gives the dungeons whose name lacks their area, and the game's name where the mod made its own;
`boss_landmarks.csv` tells apart the fights of one boss that share a place.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import replace

from eldenroll.errors import BuildError
from eldenroll.model.boss_instance import BossInstance

MAX_LOCATION = 48


def _place_parts(
    name: str, display: Mapping[str, tuple[str, str]], location_id: str
) -> tuple[str, str]:
    if location_id in display:
        return display[location_id]
    area, _, place = name.partition(" - ")
    return area, place


def with_locations(
    bosses: Sequence[BossInstance],
    names: Mapping[str, str],
    display: Mapping[str, tuple[str, str]],
    landmarks: Mapping[tuple[str, str], str],
) -> tuple[BossInstance, ...]:
    unused = sorted(set(display) - {boss.location_id for boss in bosses})
    if unused:
        raise BuildError(f"location_display names a place with no boss: {', '.join(unused)}")
    fights = {(boss.name, boss.location_label) for boss in bosses}
    stray = sorted(f"{name} on {label}" for name, label in set(landmarks) - fights)
    if stray:
        raise BuildError(f"boss_landmarks names no fight: {', '.join(stray)}")
    out: list[BossInstance] = []
    for boss in bosses:
        area, place = _place_parts(names[boss.location_id], display, boss.location_id)
        place = landmarks.get((boss.name, boss.location_label), place)
        location = f"{area}, {place}" if place else area
        if len(location) > MAX_LOCATION:
            raise BuildError(f"{boss.id} shows {location!r}, over {MAX_LOCATION} characters")
        out.append(replace(boss, location=location))
    shared = Counter((boss.name, boss.location) for boss in out)
    repeated = sorted(f"{name} at {where}" for (name, where), count in shared.items() if count > 1)
    if repeated:
        raise BuildError(f"two fights of one boss read the same: {', '.join(repeated)}")
    return tuple(out)
