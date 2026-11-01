"""Location rows built from the annotations and the area → region map.

Every annotation area becomes exactly one location. The join is strict: an area without a
region, a region row for an area the annotations do not define, or a repeated area name all
stop the build instead of dropping or duplicating a row.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from eldenrando.errors import BuildError
from eldenrando.model.annotations import Area
from eldenrando.model.location import Location


def build_locations(
    areas: Sequence[Area], region_areas: Mapping[str, str]
) -> tuple[Location, ...]:
    """Return one location per area, in annotation order, or raise `BuildError`."""
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
