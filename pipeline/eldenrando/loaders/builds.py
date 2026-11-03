"""Load `data/overrides/builds.csv` and `slot_pools.csv`, both authored seeds.

`selectors` holds `kind:id id` parts split by `;`, because the ids are slugs and a cell stays free
of quoting. A part with no ids, such as `rule:`, means every option of that kind.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.odds import parse_odds
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.build import Build
from eldenrando.model.vocabulary import BUILDS, SLOTS


@dataclass(frozen=True, slots=True)
class SlotPoolRow:
    """One row of the file, with its selectors split but not yet normalized."""

    build_id: str
    slot: str
    selectors: tuple[tuple[str, tuple[str, ...]], ...]


def load_builds(path: Path) -> tuple[Build, ...]:
    """Return the builds in file order, or raise `LoaderError` unless they are the known ones."""
    table = read_table(path, required_columns=("id", "name", "odds"))
    builds = tuple(
        Build(
            id=row[table.column("id")],
            name=row[table.column("name")],
            odds=parse_odds(path, row[table.column("id")], row[table.column("odds")]),
        )
        for row in table.rows
    )
    if tuple(build.id for build in builds) != BUILDS:
        raise LoaderError(f"{path}: expected the builds {', '.join(BUILDS)}")
    empty = sorted(build.id for build in builds if not build.name)
    if empty:
        raise LoaderError(f"{path}: empty name on {', '.join(empty)}")
    return builds


def load_slot_pools(path: Path) -> tuple[SlotPoolRow, ...]:
    """Return the rows in file order, or raise `LoaderError` on an unknown build, slot or form."""
    table = read_table(path, required_columns=("build_id", "slot", "selectors"))
    rows: list[SlotPoolRow] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        build_id = row[table.column("build_id")]
        slot = row[table.column("slot")]
        if build_id not in BUILDS:
            raise LoaderError(f"{where}: unknown build {build_id!r}")
        if slot not in SLOTS:
            raise LoaderError(f"{where}: unknown slot {slot!r}")
        rows.append(
            SlotPoolRow(build_id, slot, parse_selectors(row[table.column("selectors")], where))
        )
    return tuple(rows)


def parse_selectors(cell: str, where: str) -> tuple[tuple[str, tuple[str, ...]], ...]:
    """Return a cell's `(kind, ids)` parts; an empty cell has none."""
    out: list[tuple[str, tuple[str, ...]]] = []
    for part in filter(None, (text.strip() for text in cell.split(";"))):
        out.append(parse_selector(part, where))
    return tuple(out)


def parse_selector(part: str, where: str) -> tuple[str, tuple[str, ...]]:
    """Return one `kind:id id` part as `(kind, ids)`, or raise `LoaderError`."""
    kind, colon, ids = part.partition(":")
    if not colon:
        raise LoaderError(f"{where}: selector {part!r} has no kind")
    return kind.strip(), tuple(ids.split())
