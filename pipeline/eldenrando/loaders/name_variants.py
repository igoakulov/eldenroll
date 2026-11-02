"""Load `data/overrides/name_variants.csv`.

A `source_id` is whatever identifies the record in its own source: an `iteminfo` number or a
JSON hash. So ids stay text here, and a builder checks `source_name` before applying a row.
Each row is a correction, so it carries a reason and a reviewer. `by_name` is `true` only on a
row placement may apply where a source gives no id.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.name_variant import NameVariant

COLUMNS: tuple[str, ...] = (
    "source_id",
    "source_name",
    "canonical_name",
    "by_name",
    "reason",
    "reviewer",
)
_BY_NAME: dict[str, bool] = {"true": True, "false": False}


def load_name_variants(path: Path) -> dict[str, NameVariant]:
    """Return `{source_id: variant}` in file order, or raise `LoaderError`."""
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: dict[str, NameVariant] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name, column in columns.items():
            if not row[column]:
                raise LoaderError(f"{where}: empty {name}")
        source_id = row[columns["source_id"]]
        if source_id in out:
            raise LoaderError(f"{where}: duplicate source_id {source_id!r}")
        by_name = _BY_NAME.get(row[columns["by_name"]])
        if by_name is None:
            raise LoaderError(f"{where}: by_name is {row[columns['by_name']]!r}")
        out[source_id] = NameVariant(
            source_id=source_id,
            source_name=row[columns["source_name"]],
            canonical_name=row[columns["canonical_name"]],
            by_name=by_name,
        )
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
