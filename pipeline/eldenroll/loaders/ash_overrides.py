"""A blank `subcategory` means the whole category."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.vocabulary import SUBCATEGORIES

COLUMNS: tuple[str, ...] = ("ash", "category", "subcategory", "reason")
_REQUIRED: tuple[str, ...] = ("ash", "category", "reason")


@dataclass(frozen=True, slots=True)
class AshOverride:
    ash: str
    category: str
    subcategory: str | None


def load_ash_overrides(path: Path) -> tuple[AshOverride, ...]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: list[AshOverride] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _REQUIRED:
            if not row[columns[name]]:
                raise LoaderError(f"{where}: empty {name}")
        category = row[columns["category"]]
        subcategory = row[columns["subcategory"]] or None
        allowed = SUBCATEGORIES.get(category)
        if allowed is None or category not in ("weapon", "shield"):
            raise LoaderError(f"{where}: category is {category!r}")
        if subcategory is not None and subcategory not in allowed:
            raise LoaderError(f"{where}: {subcategory!r} is not a {category} class")
        override = AshOverride(row[columns["ash"]], category, subcategory)
        if override in out:
            raise LoaderError(f"{where}: duplicate row for {override.ash!r}")
        out.append(override)
    return tuple(out)
