"""`members` holds selectors in the `slot_pools.csv` form, because a name-based rule could catch the
wrong item. An item is named by id, or a class is named when the alias is the whole class.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenrando.loaders.builds import parse_selectors
from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError
from eldenrando.normalize.slug import slugify


@dataclass(frozen=True, slots=True)
class AliasRow:
    id: str
    label: str
    members: tuple[tuple[str, tuple[str, ...]], ...]


def load_aliases(path: Path) -> tuple[AliasRow, ...]:
    table = read_table(path, required_columns=("id", "label", "members"))
    rows: list[AliasRow] = []
    seen: set[str] = set()
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        alias_id = row[table.column("id")]
        label = row[table.column("label")]
        if alias_id != slugify(label) or not alias_id:
            raise LoaderError(f"{where}: id {alias_id!r} is not the slug of {label!r}")
        if alias_id in seen:
            raise LoaderError(f"{path}: duplicate alias id {alias_id!r}")
        seen.add(alias_id)
        members = parse_selectors(row[table.column("members")], where)
        if not members:
            raise LoaderError(f"{where}: empty members")
        rows.append(AliasRow(alias_id, label, members))
    return tuple(rows)
