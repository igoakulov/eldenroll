"""`python -m eldenroll.build.database` exits non-zero and writes nothing when any check fails."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from collections.abc import Iterable, Mapping
from pathlib import Path

from eldenroll.build.placement import DroppedValue
from eldenroll.build.serialize import database_rows, render
from eldenroll.errors import BuildError
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.database import Database
from eldenroll.paths import ROOT
from eldenroll.validate.gate_data import GateData, load_gate_data
from eldenroll.validate.quality import quality_problems
from eldenroll.validate.structure import several_top_tiers, structure_problems

DB_FILE = "db.json"
REPORT_FILE = "import-report.json"


def gate_problems(data: GateData) -> tuple[str, ...]:
    return (*structure_problems(data), *quality_problems(data))


def import_report(data: GateData) -> Mapping[str, object]:
    """Return the counts, warnings and dropped values; the app never reads them."""
    database = data.database
    return {
        "counts": _table_counts(database),
        "items_per_category": dict(Counter(row.category for row in database.items)),
        "coverage": _coverage(database),
        "infusable": {
            "true": sum(1 for row in database.items if row.infusable is True),
            "false": sum(1 for row in database.items if row.infusable is False),
        },
        "several_top_tiers": several_top_tiers(database.modifiers, database.items),
        "guarantee_targets_off_base_odds": _guarantee_targets_off_base_odds(database),
        "dropped": _dropped_rows(data.dropped),
    }


def write_artifacts(data: GateData, folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / DB_FILE).write_text(
        render(database_rows(data.database)), encoding="utf-8", newline="\n"
    )
    (folder / REPORT_FILE).write_text(render(import_report(data)), encoding="utf-8", newline="\n")


def main(arguments: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "build")
    folder: Path = parser.parse_args(arguments).out
    try:
        data = load_gate_data(ROOT)
        problems = gate_problems(data)
    except (BuildError, LoaderError) as error:
        print(f"build failed: {error}", file=sys.stderr)
        return 1
    if problems:
        print(f"gate failed, {len(problems)} problem(s):", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1
    write_artifacts(data, folder)
    print(f"gate holds; wrote {folder / DB_FILE} and {folder / REPORT_FILE}")
    return 0


def _table_counts(database: Database) -> Mapping[str, int]:
    return {table: len(rows) for table, rows in database_rows(database).items()}


def _coverage(database: Database) -> Mapping[str, Mapping[str, int]]:
    regions = {row.id: row.region_id for row in database.locations}
    dlc = {row.id for row in database.regions if row.is_dlc}
    bosses = {row.id: row.location_id for row in database.bosses}
    seen: dict[str, set[str]] = {"base": set(), "dlc": set()}
    for row in database.item_locations:
        location = row.location_id or bosses[str(row.boss_instance_id)]
        seen["dlc" if regions[location] in dlc else "base"].add(row.item_id)
    return {
        part: dict(Counter(item.category for item in database.items if item.id in ids))
        for part, ids in seen.items()
    }


def _guarantee_targets_off_base_odds(database: Database) -> list[str]:
    odds = {
        **{row.id: row.odds for row in database.items},
        **{row.id: row.odds for row in database.rules},
        **{row.id: row.odds for row in database.armor_sets},
    }
    return sorted(
        {
            target
            for row in database.modifiers
            if row.value >= 100_000
            for target in row.target.ids or ()
            if odds.get(target, 1) != 1
        }
    )


def _dropped_rows(values: Iterable[DroppedValue]) -> list[Mapping[str, object]]:
    first: dict[tuple[str, str], str] = {}
    counts: Counter[tuple[str, str]] = Counter()
    for value in values:
        key = (value.file, value.value)
        first.setdefault(key, value.key)
        counts[key] += 1
    return [
        {"file": file, "key": first[file, name], "value": name, "count": counts[file, name]}
        for file, name in sorted(first)
    ]


if __name__ == "__main__":
    sys.exit(main())
