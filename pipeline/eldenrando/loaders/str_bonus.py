"""Load `data/overrides/str_bonus_2h.csv`, weapons whose two-handed bonus differs from their class.

Each row is a correction, so it carries a reason and a reviewer.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("item", "str_bonus_2h", "reason", "reviewer")
_VALUES: dict[str, bool] = {"true": True, "false": False}


def load_str_bonus(path: Path) -> dict[str, bool]:
    """Return `{item: has the bonus}` in file order, or raise `LoaderError`."""
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
        value = _VALUES.get(row[columns["str_bonus_2h"]])
        if value is None:
            raise LoaderError(f"{where}: str_bonus_2h is {row[columns['str_bonus_2h']]!r}")
        out[item] = value
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
