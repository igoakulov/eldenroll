"""The file is edited by hand and by `eldenroll.validate.gaps`, so the writer sorts it the same way
every time: by area, then base game before DLC, then by name.
"""

from __future__ import annotations

import csv
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import cast

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.gap import (
    AREAS,
    FOUND_BY,
    ORIGINS,
    OWNERS,
    STATUSES,
    FoundBy,
    Gap,
    Origin,
    Owner,
    Status,
)

COLUMNS: tuple[str, ...] = (
    "area",
    "item",
    "origin",
    "problem",
    "found_by",
    "step",
    "owner",
    "status",
    "answer",
    "source",
)
_REQUIRED: tuple[str, ...] = COLUMNS[:8]
_ALLOWED: dict[str, Sequence[str]] = {
    "area": AREAS,
    "origin": ORIGINS,
    "found_by": FOUND_BY,
    "owner": OWNERS,
    "status": STATUSES,
}


def load_gaps(path: Path) -> tuple[Gap, ...]:
    table = read_table(path, required_columns=COLUMNS)
    columns = {name: table.column(name) for name in COLUMNS}
    out: list[Gap] = []
    seen: set[tuple[str, str]] = set()
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in _REQUIRED:
            if not row[columns[name]]:
                raise LoaderError(f"{where}: empty {name}")
        for name, allowed in _ALLOWED.items():
            if row[columns[name]] not in allowed:
                raise LoaderError(f"{where}: {name} is {row[columns[name]]!r}")
        gap = Gap(
            area=row[columns["area"]],
            item=row[columns["item"]],
            origin=cast("Origin", row[columns["origin"]]),
            problem=row[columns["problem"]],
            found_by=cast("FoundBy", row[columns["found_by"]]),
            step=row[columns["step"]],
            owner=cast("Owner", row[columns["owner"]]),
            status=cast("Status", row[columns["status"]]),
            answer=row[columns["answer"]],
            source=row[columns["source"]],
        )
        if gap.key in seen:
            raise LoaderError(f"{where}: duplicate row for {gap.area} {gap.item!r}")
        seen.add(gap.key)
        if gap.status != "open" and not (gap.answer and gap.source):
            raise LoaderError(f"{where}: {gap.status} row needs an answer and a source")
        out.append(gap)
    return tuple(out)


def write_gaps(path: Path, gaps: Iterable[Gap]) -> None:
    rows = sorted(
        gaps, key=lambda gap: (AREAS.index(gap.area), ORIGINS.index(gap.origin), gap.item)
    )
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(COLUMNS)
        for gap in rows:
            writer.writerow(getattr(gap, name) for name in COLUMNS)
