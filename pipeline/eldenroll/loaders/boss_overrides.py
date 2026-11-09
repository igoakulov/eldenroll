"""Merge and name labels are written as the boss CSV writes them, `[DLC] ` included. An addition
names its own label and location, because the CSV has no usable row for most of them: one row
there can cover several golems.
"""

from __future__ import annotations

from collections.abc import Collection
from pathlib import Path

from eldenroll.loaders.csv_source import CsvTable, read_table
from eldenroll.loaders.odds import load_odds
from eldenroll.loaders.schema import LoaderError

MERGE_COLUMNS: tuple[str, ...] = (
    "label",
    "csv_name",
    "instance",
    "instance_label",
    "reason",
)
NAME_COLUMNS: tuple[str, ...] = ("csv_name", "label", "name", "reason")
ADDITION_COLUMNS: tuple[str, ...] = (
    "name",
    "location_label",
    "location_id",
    "reason",
)


def load_boss_merges(path: Path) -> dict[tuple[str, str], tuple[str, str]]:
    """An empty `instance_label` keeps the row's own label; a fight the CSV splits across two labels
    names one here.
    """
    table = read_table(path, required_columns=MERGE_COLUMNS)
    required = tuple(column for column in MERGE_COLUMNS if column != "instance_label")
    rows = _rows(path, table, required=required, wanted=MERGE_COLUMNS[:4])
    return {
        (label, csv_name): (instance, instance_label)
        for label, csv_name, instance, instance_label in rows
    }


def load_boss_names(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(csv_name, label): name}`, where an empty label means every label."""
    table = read_table(path, required_columns=NAME_COLUMNS)
    required = tuple(column for column in NAME_COLUMNS if column != "label")
    rows = _rows(path, table, required=required, wanted=NAME_COLUMNS[:3])
    return {(csv_name, label): name for csv_name, label, name in rows}


def load_boss_additions(
    path: Path, *, location_ids: Collection[str]
) -> tuple[tuple[str, str, str], ...]:
    table = read_table(path, required_columns=ADDITION_COLUMNS)
    rows = _rows(path, table, required=ADDITION_COLUMNS, wanted=ADDITION_COLUMNS[:3])
    known = set(location_ids)
    out: list[tuple[str, str, str]] = []
    for name, label, location_id in rows:
        if location_id not in known:
            raise LoaderError(f"{path}: {name!r} has unknown location_id {location_id!r}")
        out.append((name, label, location_id))
    return tuple(out)


DISPLAY_COLUMNS: tuple[str, ...] = ("location", "area", "place", "reason")
LANDMARK_COLUMNS: tuple[str, ...] = ("boss", "label", "landmark", "reason")


def load_location_display(
    path: Path, *, location_ids: Collection[str]
) -> dict[str, tuple[str, str]]:
    """Return `{location_id: (area, place)}`; an empty place shows the area alone."""
    table = read_table(path, required_columns=DISPLAY_COLUMNS)
    required = tuple(column for column in DISPLAY_COLUMNS if column != "place")
    rows = _rows(path, table, required=required, wanted=DISPLAY_COLUMNS[:3])
    unknown = sorted({location for location, _, _ in rows} - set(location_ids))
    if unknown:
        raise LoaderError(f"{path}: unknown location {', '.join(unknown)}")
    return {location: (area, place) for location, area, place in rows}


def load_boss_landmarks(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(boss, label): landmark}`, the label as the boss CSV writes it, `[DLC] ` dropped."""
    table = read_table(path, required_columns=LANDMARK_COLUMNS)
    rows = _rows(path, table, required=LANDMARK_COLUMNS, wanted=LANDMARK_COLUMNS[:3])
    return {(boss, label): landmark for boss, label, landmark in rows}


def load_boss_odds(path: Path) -> dict[str, float]:
    return load_odds(path, "boss")


def _rows(
    path: Path, table: CsvTable, *, required: tuple[str, ...], wanted: tuple[str, ...]
) -> list[tuple[str, ...]]:
    """Return the `wanted` cells of each row; the first two are its key, which must not repeat."""
    out: list[tuple[str, ...]] = []
    seen: set[tuple[str, ...]] = set()
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in required:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        cells = tuple(row[table.column(name)] for name in wanted)
        if cells[:2] in seen:
            raise LoaderError(f"{where}: duplicate row for {cells[:2]!r}")
        seen.add(cells[:2])
        out.append(cells)
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
