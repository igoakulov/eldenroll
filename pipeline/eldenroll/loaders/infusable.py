from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("item", "infusable", "reason")
_VALUES: dict[str, bool] = {"true": True, "false": False}


def load_infusable(path: Path) -> dict[str, bool]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, bool] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        item = row[columns["item"]]
        if item in out:
            raise LoaderError(f"{where}: duplicate item {item!r}")
        value = _VALUES.get(row[columns["infusable"]])
        if value is None:
            raise LoaderError(f"{where}: infusable is {row[columns['infusable']]!r}")
        out[item] = value
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
