"""Load the tool and consumable catalog from `raw/csv/`.

`tools_consumables_categories.csv` has one row per tool or consumable entry, with the
category carried in `subCategory1`/`subCategory2`. The two fields hold `FALSE` or `-` on the
rows the classification cannot reach, so they stay raw strings here.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

CONSUMABLE_COLUMNS: tuple[str, ...] = ("Name", "AtkId", "subCategory1", "subCategory2")


def load_consumable_categories(path: Path) -> CsvTable:
    """Return `tools_consumables_categories.csv`."""
    return read_table(path, required_columns=CONSUMABLE_COLUMNS)
