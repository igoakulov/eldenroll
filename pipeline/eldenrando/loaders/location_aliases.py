"""Load the 481 micro-location label → area rows from `data/overrides/location_aliases.csv`.

The enemy-drop and boss CSVs name places in a finer vocabulary than the 174 annotation
areas, so every label is resolved by this explicit table, never by matching substrings. The
loader checks what the build relies on — one row per label, and an area that exists.
"""

from __future__ import annotations

from collections.abc import Collection
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

ALIAS_COLUMNS: tuple[str, ...] = ("label", "location_id")


def load_location_aliases(path: Path, *, location_ids: Collection[str]) -> dict[str, str]:
    """Return `{label: location_id}` in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=ALIAS_COLUMNS)
    label_column = table.column("label")
    location_column = table.column("location_id")
    known = set(location_ids)
    out: dict[str, str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        label = row[label_column]
        location_id = row[location_column]
        if not label:
            raise LoaderError(f"{where}: empty label")
        if not location_id:
            raise LoaderError(f"{where}: empty location_id")
        if location_id not in known:
            raise LoaderError(f"{where}: unknown location_id {location_id!r}")
        if label in out:
            raise LoaderError(f"{where}: duplicate label {label!r}")
        out[label] = location_id
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
