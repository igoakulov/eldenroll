"""Only the name is authored; a builder takes everything else from the same source as the rest of
its pool.
"""

from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("name", "reason")


def load_added_items(path: Path) -> tuple[str, ...]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: list[str] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        item_name = row[columns["name"]]
        if item_name in out:
            raise LoaderError(f"{where}: duplicate name {item_name!r}")
        out.append(item_name)
    if not out:
        raise LoaderError(f"{path}: no rows")
    return tuple(out)
