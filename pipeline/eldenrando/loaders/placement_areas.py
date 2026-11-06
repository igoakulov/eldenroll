"""Each row places one item's slot lines at an area other than the slot's `Area`, for an item the
player can reach only through a place in another region, such as an invader a Volcano Manor letter
calls. Several rows for one item and area give it each of their areas.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

_COLUMNS: tuple[str, ...] = ("item", "area", "placed_at", "reason", "reviewer")


def load_placement_areas(path: Path) -> dict[tuple[str, str], tuple[str, ...]]:
    """Return `{(item, area): the areas its rows go to instead}`."""
    table = read_table(path, required_columns=_COLUMNS)
    out: dict[tuple[str, str], tuple[str, ...]] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _COLUMNS:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        key = (row[table.column("item")], row[table.column("area")])
        placed_at = row[table.column("placed_at")]
        if placed_at in out.get(key, ()):
            raise LoaderError(f"{where}: duplicate row for {(*key, placed_at)!r}")
        out[key] = (*out.get(key, ()), placed_at)
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
