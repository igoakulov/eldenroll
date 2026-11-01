"""Load the three boss CSVs from `raw/csv/`.

`boss_creature_locations.csv` carries the boss pool: line 1 is a section legend, line 2 is
the real header, and 3,254 data rows follow. The two
`bosses_with_locations_levels_runes_item_drops*.csv` exports are unused by the build but
stay loaded so a later cross-check does not re-parse them by hand.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

BOSS_CREATURE_HEADER_ROW = 1
BOSS_CREATURE_COLUMNS: tuple[str, ...] = ("Location", "Name", "Npc_ID", "Chara_ID", "LookupID")
BOSS_SUMMARY_COLUMNS: tuple[str, ...] = ("Encounter Name", "Region", "Location")


def load_boss_creature_locations(path: Path) -> CsvTable:
    """Return `boss_creature_locations.csv`, starting after its legend line."""
    return read_table(
        path,
        header_row=BOSS_CREATURE_HEADER_ROW,
        required_columns=BOSS_CREATURE_COLUMNS,
    )


def load_boss_summary(path: Path) -> CsvTable:
    """Return one of the two unused boss summary exports."""
    return read_table(path, required_columns=BOSS_SUMMARY_COLUMNS)
