"""Load an override file of base odds: the rows whose odds are not the default 1.

Each row is a correction, so it carries a reason and a reviewer. An id is the key, because a name
can repeat across categories or labels.
"""

from __future__ import annotations

import math
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError


def load_odds(path: Path, key_column: str) -> dict[str, float]:
    """Return `{id: odds}`, or raise `LoaderError`."""
    columns = (key_column, "odds", "reason", "reviewer")
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
        out[key] = _odds(path, key, row[table.column("odds")])
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out


def _odds(path: Path, key: str, text: str) -> float:
    """Return a finite number at or above 0, or raise `LoaderError`."""
    try:
        odds = float(text)
    except ValueError as error:
        raise LoaderError(f"{path}: {key!r} has odds {text!r}") from error
    if not math.isfinite(odds) or odds < 0:
        raise LoaderError(f"{path}: {key!r} has odds {text!r}")
    return odds
