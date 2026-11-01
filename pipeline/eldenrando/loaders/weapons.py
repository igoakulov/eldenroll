"""Load the weapon and ash CSVs from `raw/csv/`.

`weapons_shields_categories.csv` holds one row per weapon name, grouped by class; the 42
class separators are blank rows and are kept so the row count stays 530.
`ashes_compatibility_no_DLC.csv` is the ash by weapon-class matrix of `TRUE`/`FALSE` cells.
`ashes_somber_weapons.csv` holds one row per skill attack, not one per weapon.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

WEAPON_CATEGORY_COLUMNS: tuple[str, ...] = ("Weapon Class", "Weapon")
ASH_COMPATIBILITY_COLUMNS: tuple[str, ...] = ("Name",)
SOMBER_WEAPON_COLUMNS: tuple[str, ...] = ("Name",)


def load_weapon_categories(path: Path) -> CsvTable:
    """Return `weapons_shields_categories.csv`."""
    return read_table(path, required_columns=WEAPON_CATEGORY_COLUMNS)


def load_ash_compatibility(path: Path) -> CsvTable:
    """Return `ashes_compatibility_no_DLC.csv`."""
    return read_table(path, required_columns=ASH_COMPATIBILITY_COLUMNS)


def load_somber_weapons(path: Path) -> CsvTable:
    """Return `ashes_somber_weapons.csv`."""
    return read_table(path, required_columns=SOMBER_WEAPON_COLUMNS)
