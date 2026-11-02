"""Load `data/overrides/armor_slots.csv`, the slots of the pieces `armors.json` does not hold.

Each row is a correction, so it carries a reason and a reviewer.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.vocabulary import ARMOR_SLOTS

COLUMNS: tuple[str, ...] = ("piece", "slot", "reason", "reviewer")


def load_armor_slots(path: Path) -> dict[str, str]:
    """Return `{piece: slot}` in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        piece = row[columns["piece"]]
        if piece in out:
            raise LoaderError(f"{where}: duplicate piece {piece!r}")
        slot = row[columns["slot"]]
        if slot not in ARMOR_SLOTS:
            raise LoaderError(f"{where}: slot is {slot!r}")
        out[piece] = slot
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
