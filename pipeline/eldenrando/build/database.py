"""The build: run the gate, then write `db.json` and `import-report.json` (`data.md` §11, §12).

`python -m eldenrando.build.database` exits non-zero and writes nothing when any check fails.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from collections.abc import Iterable, Mapping
from pathlib import Path

from eldenrando.build.placement import DroppedValue
from eldenrando.build.serialize import database_rows, render
from eldenrando.errors import BuildError
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.database import Database
from eldenrando.paths import ROOT
from eldenrando.validate.gate_data import GateData, load_gate_data
from eldenrando.validate.quality import quality_problems
from eldenrando.validate.structure import several_top_tiers, structure_problems

DB_FILE = "db.json"
REPORT_FILE = "import-report.json"


def gate_problems(data: GateData) -> tuple[str, ...]:
    """Return every failure of the Phase 0 gate."""
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
    """Write both files, as text with fixed line endings."""
    folder.mkdir(parents=True, exist_ok=True)
    (folder / DB_FILE).write_text(
        render(database_rows(data.database)), encoding="utf-8", newline="\n"
    )
    (folder / REPORT_FILE).write_text(render(import_report(data)), encoding="utf-8", newline="\n")


def main(arguments: list[str] | None = None) -> int:
    """Return 0 after writing the files, or 1 after printing what failed."""
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
    """Return the row count of each table."""
    return {table: len(rows) for table, rows in database_rows(database).items()}


def _coverage(database: Database) -> Mapping[str, Mapping[str, int]]:
    """Return how many items of each category have a row in the base game and in the DLC."""
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
    """Return the targets of a guarantee whose base odds are not 1 (`prd.md` §8.5)."""
    odds = {
        **{row.id: row.odds for row in database.items},
        **{row.id: row.odds for row in database.rules},
        **{row.id: row.odds for row in database.armor_sets},
    }
    return sorted(
        {
            target
            for row in database.modifiers
            if row.value >= 10_000
            for target in row.target.ids or ()
            if odds.get(target, 1) != 1
        }
    )


def _dropped_rows(values: Iterable[DroppedValue]) -> list[Mapping[str, object]]:
    """Return one row per dropped value and file, with where it was first seen and how often."""
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
