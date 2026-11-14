"""`region_level` must ascend down the file: a row out of order is a mistake in the seed, not
something to sort away.
"""

from __future__ import annotations

from itertools import pairwise
from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.region import Region

REGION_COLUMNS: tuple[str, ...] = ("id", "name", "region_level", "run_left")


def load_regions(path: Path) -> tuple[Region, ...]:
    table = read_table(path, required_columns=REGION_COLUMNS)
    id_column = table.column("id")
    name_column = table.column("name")
    level_column = table.column("region_level")
    run_left_column = table.column("run_left")
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
                run_left=_parse_run_left(row[run_left_column], where),
            )
        )
    _check_ids_and_levels(regions, str(path))
    return tuple(regions)


def _parse_level(value: str, where: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise LoaderError(f"{where}: region_level {value!r} is not an integer") from exc


def _parse_run_left(value: str, where: str) -> float:
    try:
        share = float(value)
    except ValueError as exc:
        raise LoaderError(f"{where}: run_left {value!r} is not a number") from exc
    if not 0 < share <= 1:
        raise LoaderError(f"{where}: run_left {share} is not above 0 and at most 1")
    return share


def _check_ids_and_levels(regions: list[Region], path: str) -> None:
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
