"""An id is the key, because a name can repeat across categories or labels. A file with no rows
means every row keeps odds 1.
"""

from __future__ import annotations

import math
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError


def load_odds(path: Path, key_column: str) -> dict[str, float]:
    columns = (key_column, "odds", "reason")
    table = read_table(path, required_columns=columns)
    out: dict[str, float] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in columns:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        key = row[table.column(key_column)]
        if key in out:
            raise LoaderError(f"{path}: duplicate {key_column} {key!r}")
        out[key] = parse_odds(path, key, row[table.column("odds")])
    return out


def parse_odds(path: Path, key: str, text: str) -> float:
    try:
        odds = float(text)
    except ValueError as error:
        raise LoaderError(f"{path}: {key!r} has odds {text!r}") from error
    if not math.isfinite(odds) or odds < 0:
        raise LoaderError(f"{path}: {key!r} has odds {text!r}")
    return odds
