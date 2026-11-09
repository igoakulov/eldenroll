"""The sheet is base-game data: a `TRUE` cell says an ash fits a class, and its affinity columns say
nothing here. It has no row for the DLC ashes and no column for the DLC classes, so
`data/gaps.csv` tracks those until the overrides hold them. An ash fitting every shield class
becomes one whole-category row, so no row is ever covered by a broader one. Weapons have no such
row, because the sheet cannot speak for the classes it lacks.
"""

from __future__ import annotations

from collections.abc import Iterable

from eldenroll.build.ashes import EXCLUDED
from eldenroll.errors import BuildError
from eldenroll.loaders.ash_overrides import AshOverride
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.model.ash_compatibility import AshCompatibility
from eldenroll.model.item import Item
from eldenroll.model.vocabulary import SHIELD

_FIRST_CLASS_COLUMN = "Dagger"
_NOT_A_CLASS = "NONE"
_RENAMED_CLASSES = {"Staff": "glintstone_staff", "Seal": "sacred_seal"}
_CELLS = {"TRUE": True, "FALSE": False}


def build_ash_compatibility(
    table: Iterable[Item], sheet: CsvTable, overrides: Iterable[AshOverride]
) -> tuple[AshCompatibility, ...]:
    ids = {row.name: row.id for row in table if row.category == "ash"}
    found: dict[str, set[tuple[str, str | None]]] = {}
    for ash, category, subcategory in _sheet_rows(sheet, ids):
        found.setdefault(ash, set()).add((category, subcategory))
    for override in overrides:
        if override.ash not in ids:
            raise BuildError(f"ash compatibility override names no ash: {override.ash}")
        found.setdefault(override.ash, set()).add((override.category, override.subcategory))
    return tuple(
        AshCompatibility(ids[ash], category, subcategory)
        for ash, rows in found.items()
        for category, subcategory in sorted(_broadest(rows), key=str)
    )


def _sheet_rows(sheet: CsvTable, ids: Iterable[str]) -> list[tuple[str, str, str]]:
    known = set(ids)
    name_column = sheet.column("Name")
    start = sheet.header.index(_FIRST_CLASS_COLUMN)
    out: list[tuple[str, str, str]] = []
    for row in sheet.rows:
        ash = row[name_column].strip()
        if ash in EXCLUDED:
            continue
        if ash not in known:
            raise BuildError(f"the ash sheet names no pool ash: {ash}")
        for column in range(start, len(sheet.header)):
            name = sheet.header[column]
            cell = _CELLS.get(row[column])
            if cell is None:
                raise BuildError(f"{ash}: {name} cell is {row[column]!r}")
            if cell and name != _NOT_A_CLASS:
                subcategory = _RENAMED_CLASSES.get(name, name.casefold().replace(" ", "_"))
                category = "shield" if subcategory in SHIELD else "weapon"
                out.append((ash, category, subcategory))
    return out


def _broadest(rows: set[tuple[str, str | None]]) -> set[tuple[str, str | None]]:
    out = set(rows)
    if {subcategory for category, subcategory in rows if category == "shield"} >= SHIELD:
        out.add(("shield", None))
    for category, subcategory in rows | out:
        if subcategory is None:
            out = {row for row in out if row[0] != category or row[1] is None}
    return out
