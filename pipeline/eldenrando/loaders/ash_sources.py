"""The mod's ash group has no item for these, so the file adds them to the pool and says which
weapons give each one. A weapon is written as the slot lines name it, because only some copies
carry the ash: `Banished Knight's Halberd +8` does and the plain halberd does not.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("ash", "weapon", "reason", "reviewer")


def load_ash_sources(path: Path) -> dict[str, tuple[str, ...]]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, list[str]] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        weapons = out.setdefault(row[columns["ash"]], [])
        weapon = row[columns["weapon"]]
        if weapon in weapons:
            raise LoaderError(f"{where}: duplicate weapon {weapon!r} for {row[columns['ash']]!r}")
        weapons.append(weapon)
    if not out:
        raise LoaderError(f"{path}: no rows")
    return {ash: tuple(weapons) for ash, weapons in out.items()}
