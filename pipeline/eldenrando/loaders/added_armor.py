"""Each row adds an armor piece the mod has no item for. A piece with `copies` is found wherever
that piece is, such as the altered form of a piece that changes its name when altered. A piece
without it is found nowhere, so it counts in every region, like a `None` piece that keeps a slot
empty.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

_COLUMNS: tuple[str, ...] = ("piece", "slot", "copies", "reason")
_REQUIRED: tuple[str, ...] = ("piece", "slot", "reason")
_SLOTS = ("head", "body", "arms", "legs")


def load_added_armor(path: Path) -> dict[str, tuple[str, str]]:
    """Return `{piece: (slot, the piece whose locations it shares, or "")}`."""
    table = read_table(path, required_columns=_COLUMNS)
    out: dict[str, tuple[str, str]] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _REQUIRED:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        piece = row[table.column("piece")]
        slot = row[table.column("slot")]
        if slot not in _SLOTS:
            raise LoaderError(f"{where}: unknown slot {slot!r}")
        if piece in out:
            raise LoaderError(f"{where}: duplicate piece {piece!r}")
        out[piece] = (slot, row[table.column("copies")])
    return out
