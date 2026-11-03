"""Load the enemy table the boss pool comes from (`data/sources/bosses/`).

`enemy_locations.csv` holds every enemy: line 1 is a section legend, line 2 is the real header,
and 3,254 data rows follow. Only the rows tagged `[Boss]` start as boss instances.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

BOSS_CREATURE_HEADER_ROW = 1
BOSS_CREATURE_COLUMNS: tuple[str, ...] = ("Location", "Name")


def load_boss_creature_locations(path: Path) -> CsvTable:
    """Return `enemy_locations.csv`, starting after its legend line."""
    return read_table(
        path,
        header_row=BOSS_CREATURE_HEADER_ROW,
        required_columns=BOSS_CREATURE_COLUMNS,
    )
