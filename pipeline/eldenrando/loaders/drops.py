"""Load the two enemy-drop CSVs from `raw/csv/`.

`item_drop_locations.csv` lists one enemy per row with up to 13 drop columns;
`item_drops.csv` lists one item lot per row with 10 item/chance pairs. `Npc_ID` joins the
two, so placement reads both tables instead of merging them here.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

DROP_LOCATION_COLUMNS: tuple[str, ...] = ("Location", "Name")
ITEM_DROP_COLUMNS: tuple[str, ...] = ("ItemLot_Enemy ID", "Items Drop 1", "Item Chance 1")


def load_drop_locations(path: Path) -> CsvTable:
    """Return `item_drop_locations.csv`."""
    return read_table(path, required_columns=DROP_LOCATION_COLUMNS)


def load_item_drops(path: Path) -> CsvTable:
    """Return `item_drops.csv`."""
    return read_table(path, required_columns=ITEM_DROP_COLUMNS)
