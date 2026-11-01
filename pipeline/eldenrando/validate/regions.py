"""Region invariants that hold across the whole seed and location table.

The region rows are authored and the locations are joined from annotations, so the checks
here are the ones a bad edit would break: an orphan location, an empty region, or a DLC
prefix that disagrees with the areas it contains.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Collection, Sequence

from eldenrando.errors import BuildError
from eldenrando.model.location import Location
from eldenrando.model.region import Region

MAX_REGION_LOCATIONS: int = 29


def validate_region_membership(
    regions: Sequence[Region], locations: Sequence[Location]
) -> None:
    """Raise unless every location has a region and every region holds 1 to 29 locations."""
    region_ids = {region.id for region in regions}
    unknown = sorted({location.region_id for location in locations} - region_ids)
    if unknown:
        raise BuildError(f"location(s) point at unknown region(s): {', '.join(unknown)}")
    counts = Counter(location.region_id for location in locations)
    empty = [region.id for region in regions if counts[region.id] == 0]
    if empty:
        raise BuildError(f"region(s) hold no location: {', '.join(empty)}")
    oversized = [region.id for region in regions if counts[region.id] > MAX_REGION_LOCATIONS]
    if oversized:
        raise BuildError(
            f"region(s) hold more than {MAX_REGION_LOCATIONS} locations: {', '.join(oversized)}"
        )


def validate_region_dlc_prefix(
    regions: Sequence[Region],
    locations: Sequence[Location],
    *,
    dlc_location_ids: Collection[str],
) -> None:
    """Raise unless `DLC: ` in the region name matches its locations exactly."""
    dlc_ids = set(dlc_location_ids)
    members: dict[str, list[Location]] = {region.id: [] for region in regions}
    for location in locations:
        members.setdefault(location.region_id, []).append(location)
    for region in regions:
        flags = {location.id in dlc_ids for location in members[region.id]}
        if len(flags) > 1:
            raise BuildError(
                f"region {region.id!r} mixes DLC and base locations and cannot carry "
                f"a {'DLC' if region.is_dlc else 'base'} name"
            )
        holds_dlc = True in flags
        if region.is_dlc != holds_dlc:
            expected = "the `DLC: ` prefix" if holds_dlc else "no `DLC: ` prefix"
            raise BuildError(
                f"region {region.id!r} name has the wrong DLC prefix: "
                f"its locations need {expected}"
            )
