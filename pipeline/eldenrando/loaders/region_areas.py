"""Load the 174 area → region rows from `data/overrides/region_areas.csv`.

The map is authored: the randomizer groups areas that share an access path and a level band,
and that grouping is not derivable from the annotations. The loader checks what the build
relies on — one row per area, and a region that exists in the seed.
"""

from __future__ import annotations

from collections.abc import Collection
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

AREA_COLUMNS: tuple[str, ...] = ("area", "region_id")


def load_region_areas(path: Path, *, region_ids: Collection[str]) -> dict[str, str]:
    """Return `{area: region_id}` in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=AREA_COLUMNS)
    area_column = table.column("area")
    region_column = table.column("region_id")
    known = set(region_ids)
    out: dict[str, str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        area = row[area_column]
        region_id = row[region_column]
        if not area:
            raise LoaderError(f"{where}: empty area")
        if not region_id:
            raise LoaderError(f"{where}: empty region_id")
        if region_id not in known:
            raise LoaderError(f"{where}: unknown region_id {region_id!r}")
        if area in out:
            raise LoaderError(f"{where}: duplicate area {area!r}")
        out[area] = region_id
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
