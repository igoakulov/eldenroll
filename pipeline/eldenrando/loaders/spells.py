"""Load the spell attack table from `raw/csv/`.

`spells.csv` holds one row per spell attack, 523 in all. Names repeat with suffixes such as
`(Lacking FP)`, so this table is a name cross-check, not a spell catalog.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table

SPELL_COLUMNS: tuple[str, ...] = ("Type", "Name", "AtkID")


def load_spell_table(path: Path) -> CsvTable:
    """Return `spells.csv`."""
    return read_table(path, required_columns=SPELL_COLUMNS)
