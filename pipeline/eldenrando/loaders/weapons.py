"""The class separators are blank rows and are kept so the row count matches the sheet.
`weapon_skills.csv` holds one row per skill attack, not one per weapon.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

WEAPON_CATEGORY_COLUMNS: tuple[str, ...] = ("Weapon Class", "Weapon")
ASH_COMPATIBILITY_COLUMNS: tuple[str, ...] = ("Name",)
SOMBER_WEAPON_COLUMNS: tuple[str, ...] = ("Name",)


def load_weapon_categories(path: Path) -> CsvTable:
    return read_table(path, required_columns=WEAPON_CATEGORY_COLUMNS)


def load_ash_compatibility(path: Path) -> CsvTable:
    return read_table(path, required_columns=ASH_COMPATIBILITY_COLUMNS)


def load_somber_weapons(path: Path) -> CsvTable:
    return read_table(path, required_columns=SOMBER_WEAPON_COLUMNS)
