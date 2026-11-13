"""Each row places one enemy's drops on one map label at another area than the label's alias, for a
label that names a tile too coarsely, such as `Siofra River` holding Nokron's enemies too.
"""

from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

_COLUMNS: tuple[str, ...] = ("enemy", "label", "area", "reason")


def load_drop_areas(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(enemy, label): the area its drops go to}`."""
    table = read_table(path, required_columns=_COLUMNS)
    out: dict[tuple[str, str], str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _COLUMNS:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        key = (row[table.column("enemy")], row[table.column("label")])
        if key in out:
            raise LoaderError(f"{where}: duplicate row for {key!r}")
        out[key] = row[table.column("area")]
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
