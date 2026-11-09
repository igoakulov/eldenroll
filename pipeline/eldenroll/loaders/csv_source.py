"""The files under `data/sources/` are hand-kept spreadsheets, not machine exports: one starts with
a section legend, several have blank or repeated header cells, and one uses blank rows as class
separators. So the reader keeps every row positionally, checks each width against the header, and
reports the file and row instead of guessing a value.
"""

from __future__ import annotations

import csv
import io
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from eldenroll.loaders.schema import LoaderError


@dataclass(frozen=True, slots=True)
class CsvTable:
    path: Path
    header_row: int
    header: tuple[str, ...]
    rows: tuple[tuple[str, ...], ...]

    @property
    def row_count(self) -> int:
        """Blank rows are included in the count."""
        return len(self.rows)

    @property
    def blank_row_count(self) -> int:
        return sum(1 for row in self.rows if all(cell == "" for cell in row))

    def column(self, name: str) -> int:
        """Return the index of the single header cell named `name`."""
        return _column_index(self.header, name, str(self.path))


def read_table(
    path: Path,
    *,
    header_row: int = 0,
    required_columns: Sequence[str] = (),
) -> CsvTable:
    rows = _read_rows(path)
    if len(rows) <= header_row:
        raise LoaderError(f"{path}: missing header row {header_row + 1}")
    header = rows[header_row]
    data = rows[header_row + 1 :]
    for index, row in enumerate(data, start=1):
        if len(row) != len(header):
            raise LoaderError(
                f"{path}: data row {index} has {len(row)} fields, expected {len(header)}"
            )
    for name in required_columns:
        _column_index(header, name, str(path))
    return CsvTable(
        path=path,
        header_row=header_row,
        header=tuple(header),
        rows=tuple(tuple(row) for row in data),
    )


def _column_index(header: Sequence[str], name: str, path: str) -> int:
    matches = [index for index, cell in enumerate(header) if cell == name]
    if not matches:
        raise LoaderError(f"{path}: missing column {name!r}")
    if len(matches) > 1:
        raise LoaderError(f"{path}: column {name!r} appears {len(matches)} times")
    return matches[0]


def _read_rows(path: Path) -> list[list[str]]:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise LoaderError(f"{path}: cannot read ({exc})") from exc
    except UnicodeDecodeError as exc:
        raise LoaderError(f"{path}: not UTF-8 ({exc})") from exc
    try:
        return list(csv.reader(io.StringIO(text, newline="")))
    except csv.Error as exc:
        raise LoaderError(f"{path}: invalid CSV ({exc})") from exc
