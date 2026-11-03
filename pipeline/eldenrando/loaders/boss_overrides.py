"""Load the boss corrections from `data/overrides/` (`data.md` §6.1, §6.1a).

Each row is a correction, so it carries a reason and a reviewer. Labels are written as the boss
CSV writes them, `[DLC] ` included.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import CsvTable, read_table
from eldenrando.loaders.schema import LoaderError

MERGE_COLUMNS: tuple[str, ...] = ("label", "csv_name", "instance", "reason", "reviewer")
NAME_COLUMNS: tuple[str, ...] = ("csv_name", "label", "name", "reason", "reviewer")
ADDITION_COLUMNS: tuple[str, ...] = ("name", "label", "reason", "reviewer")


def load_boss_merges(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(label, csv_name): instance name}`, or raise `LoaderError`."""
    table = read_table(path, required_columns=MERGE_COLUMNS)
    rows = _rows(path, table, required=MERGE_COLUMNS, wanted=MERGE_COLUMNS[:3])
    return {(label, csv_name): instance for label, csv_name, instance in rows}


def load_boss_names(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(csv_name, label): name}`, where an empty label means every label."""
    table = read_table(path, required_columns=NAME_COLUMNS)
    required = tuple(column for column in NAME_COLUMNS if column != "label")
    rows = _rows(path, table, required=required, wanted=NAME_COLUMNS[:3])
    return {(csv_name, label): name for csv_name, label, name in rows}


def load_boss_additions(path: Path) -> tuple[tuple[str, str], ...]:
    """Return `(name, label)` of the bosses the CSV leaves untagged, in file order."""
    table = read_table(path, required_columns=ADDITION_COLUMNS)
    rows = _rows(path, table, required=ADDITION_COLUMNS, wanted=ADDITION_COLUMNS[:2])
    return tuple((name, label) for name, label in rows)


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
