"""Load `data/overrides/armor_sets.csv`, which pieces each armor set holds (`data.md` §4.3).

One row per set and piece, in the set's order, each with a reason and a reviewer. A set with no
pieces is one row with an empty `piece`.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("set", "piece", "reason", "reviewer")
_REQUIRED: tuple[str, ...] = ("set", "reason", "reviewer")
_MOST_PIECES = 4


def load_armor_sets(path: Path) -> dict[str, tuple[str, ...]]:
    """Return `{set: piece names}` in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, list[str]] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _REQUIRED:
            if not row[columns[name]]:
                raise LoaderError(f"{where}: empty {name}")
        name = row[columns["set"]]
        piece = row[columns["piece"]]
        if name in out and not (piece and out[name]):
            raise LoaderError(f"{where}: {name!r} has an empty piece and another row")
        pieces = out.setdefault(name, [])
        if piece in pieces:
            raise LoaderError(f"{where}: {name!r} repeats {piece!r}")
        if piece:
            pieces.append(piece)
        if len(pieces) > _MOST_PIECES:
            raise LoaderError(f"{where}: {name!r} holds more than {_MOST_PIECES} pieces")
    if not out:
        raise LoaderError(f"{path}: no rows")
    return {name: tuple(pieces) for name, pieces in out.items()}
