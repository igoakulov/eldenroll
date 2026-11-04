from __future__ import annotations

from collections.abc import Mapping, Sequence

from eldenrando.errors import BuildError
from eldenrando.model.annotations import Area
from eldenrando.model.location import Location


def build_locations(
    areas: Sequence[Area], region_areas: Mapping[str, str]
) -> tuple[Location, ...]:
    known = {area.name for area in areas}
    unknown = sorted(set(region_areas) - known)
    if unknown:
        raise BuildError(f"region_areas names unknown area(s): {', '.join(unknown)}")
    seen: set[str] = set()
    out: list[Location] = []
    for area in areas:
        if area.name in seen:
            raise BuildError(f"duplicate annotation area {area.name!r}")
        seen.add(area.name)
        region_id = region_areas.get(area.name)
        if region_id is None:
            raise BuildError(f"area {area.name!r} has no region")
        out.append(Location(id=area.name, name=area.text, region_id=region_id))
    return tuple(out)
