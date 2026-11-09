"""The enemy-drop and boss CSVs name places in a finer vocabulary than the annotation areas, so
every label is resolved by the explicit `location_aliases.csv`, never by matching substrings.
`boss_location_overrides.csv` holds the bosses that are not where their label's other contents
are.
"""

from __future__ import annotations

from collections.abc import Collection
from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

ALIAS_COLUMNS: tuple[str, ...] = ("label", "location_id")
BOSS_OVERRIDE_COLUMNS: tuple[str, ...] = ("boss", "label", "location_id", "reason")


def load_location_aliases(path: Path, *, location_ids: Collection[str]) -> dict[str, str]:
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


def load_boss_location_overrides(
    path: Path, *, labels: Collection[str], location_ids: Collection[str]
) -> dict[tuple[str, str], str]:
    table = read_table(path, required_columns=BOSS_OVERRIDE_COLUMNS)
    columns = {name: table.column(name) for name in BOSS_OVERRIDE_COLUMNS}
    known_labels = set(labels)
    known_locations = set(location_ids)
    out: dict[tuple[str, str], str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        boss = row[columns["boss"]]
        label = row[columns["label"]]
        location_id = row[columns["location_id"]]
        if label not in known_labels:
            raise LoaderError(f"{where}: unknown label {label!r}")
        if location_id not in known_locations:
            raise LoaderError(f"{where}: unknown location_id {location_id!r}")
        if (boss, label) in out:
            raise LoaderError(f"{where}: duplicate override for {boss!r} on {label!r}")
        out[(boss, label)] = location_id
    return out
