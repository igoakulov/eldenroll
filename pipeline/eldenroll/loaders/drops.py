"""`Npc_ID` joins the two, so placement reads both tables instead of merging them here."""

from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import CsvTable, read_table

DROP_LOCATION_COLUMNS: tuple[str, ...] = ("Location", "Name")
ITEM_DROP_COLUMNS: tuple[str, ...] = ("ItemLot_Enemy ID", "Items Drop 1", "Item Chance 1")


def load_drop_locations(path: Path) -> CsvTable:
    return read_table(path, required_columns=DROP_LOCATION_COLUMNS)


def load_item_drops(path: Path) -> CsvTable:
    return read_table(path, required_columns=ITEM_DROP_COLUMNS)
