"""A row states all five stats, so it replaces a record whole."""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

STATS: tuple[str, ...] = ("str", "dex", "int", "fth", "arc")
COLUMNS: tuple[str, ...] = ("item", *STATS, "reason", "reviewer")


def load_requirements(path: Path) -> dict[str, dict[str, int]]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, dict[str, int]] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        item = row[columns["item"]]
        if item in out:
            raise LoaderError(f"{where}: duplicate item {item!r}")
        stats: dict[str, int] = {}
        for stat in STATS:
            cell = row[columns[stat]]
            if not cell.isdecimal():
                raise LoaderError(f"{where}: {stat} is {cell!r}")
            stats[stat] = int(cell)
        out[item] = stats
    return out
