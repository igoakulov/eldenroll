"""Load the 17 region rows from `data/overrides/regions.csv`.

The seed is authored, not derived, so the loader only checks the shape a reader relies on:
no empty id or name, a unique id, and `region_level` strictly ascending down the file. A row
out of order is a mistake in the seed, not something to sort away.
"""

from __future__ import annotations

from itertools import pairwise
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.region import Region

REGION_COLUMNS: tuple[str, ...] = ("id", "name", "region_level")


def load_regions(path: Path) -> tuple[Region, ...]:
    """Return the region seed rows in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=REGION_COLUMNS)
    id_column = table.column("id")
    name_column = table.column("name")
    level_column = table.column("region_level")
    regions: list[Region] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        region_id = row[id_column]
        region_name = row[name_column]
        if not region_id:
            raise LoaderError(f"{where}: empty region id")
        if not region_name:
            raise LoaderError(f"{where}: empty region name")
        regions.append(
            Region(
                id=region_id,
                name=region_name,
                region_level=_parse_level(row[level_column], where),
            )
        )
    _check_ids_and_levels(regions, str(path))
    return tuple(regions)


def _parse_level(value: str, where: str) -> int:
    """Return `region_level` as an integer, or raise."""
    try:
        return int(value)
    except ValueError as exc:
        raise LoaderError(f"{where}: region_level {value!r} is not an integer") from exc


def _check_ids_and_levels(regions: list[Region], path: str) -> None:
    """Raise unless ids are unique and levels are unique and ascending."""
    seen_ids: set[str] = set()
    levels: dict[int, str] = {}
    for region in regions:
        if region.id in seen_ids:
            raise LoaderError(f"{path}: duplicate region id {region.id!r}")
        seen_ids.add(region.id)
        if region.region_level in levels:
            raise LoaderError(
                f"{path}: region_level {region.region_level} is used by both "
                f"{levels[region.region_level]!r} and {region.id!r}"
            )
        levels[region.region_level] = region.id
    for earlier, later in pairwise(regions):
        if later.region_level <= earlier.region_level:
            raise LoaderError(
                f"{path}: region_level {later.region_level} at {later.id!r} does not follow "
                f"{earlier.region_level} at {earlier.id!r}"
            )
