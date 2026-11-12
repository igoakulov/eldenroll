"""A key is the row's kind and id, because a name can repeat across categories. An empty `url`
keeps the row without a link; the build checks the kinds and ids (`eldenroll/build/wiki.py`).
"""

from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

COLUMNS: tuple[str, ...] = ("kind", "id", "url", "reason")
_REQUIRED: tuple[str, ...] = ("kind", "id", "reason")


def load_wiki_urls(path: Path) -> dict[tuple[str, str], str]:
    """Return `{(kind, id): url}`, where an empty url means no link."""
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[tuple[str, str], str] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _REQUIRED:
            if not row[columns[name]]:
                raise LoaderError(f"{where}: empty {name}")
        key = (row[columns["kind"]], row[columns["id"]])
        if key in out:
            raise LoaderError(f"{where}: duplicate row for {key[0]} {key[1]!r}")
        out[key] = row[columns["url"]]
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
