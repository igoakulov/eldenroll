"""The two fields hold `FALSE` or `-` on the rows the classification cannot reach, so they stay raw
strings here.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

CONSUMABLE_COLUMNS: tuple[str, ...] = ("Name", "subCategory1", "subCategory2")


def load_consumable_categories(path: Path) -> CsvTable:
    return read_table(path, required_columns=CONSUMABLE_COLUMNS)
