"""Load the files that tie an item to the boss it comes from (`data.md` §5.2, §9).

Each row names a boss instance by its name and label, because a name can repeat across labels. A
label may keep the boss CSV's `[DLC] ` prefix. Each row is a correction, so it carries a reason and
a reviewer.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.csv_source import read_table
from eldenrando.loaders.schema import LoaderError

_DLC_TAG = "[DLC] "
_BOSS_COLUMNS: tuple[str, ...] = ("boss", "location_label", "reason", "reviewer")

BossPlace = tuple[str, str]


def load_remembrance_bosses(path: Path) -> dict[str, BossPlace]:
    """Return `{remembrance: (boss, label)}`, or raise `LoaderError`."""
    return {key[0]: place for key, place in _load(path, ("remembrance",)).items()}


def load_armor_shop_bosses(path: Path) -> dict[str, BossPlace]:
    """Return `{name after 'after defeating' on Enia's slot line: (boss, label)}`."""
    return {key[0]: place for key, place in _load(path, ("defeated",)).items()}


def load_slot_links(path: Path) -> dict[tuple[str, str], BossPlace]:
    """Return `{(item, area): (boss, label)}`, or raise `LoaderError`."""
    return {(key[0], key[1]): place for key, place in _load(path, ("item", "area")).items()}


def _load(path: Path, key_columns: tuple[str, ...]) -> dict[tuple[str, ...], BossPlace]:
    """Return each row's key cells with its boss and label, or raise `LoaderError`."""
    columns = (*key_columns, *_BOSS_COLUMNS)
    table = read_table(path, required_columns=columns)
    out: dict[tuple[str, ...], BossPlace] = {}
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        for name in columns:
            if not row[table.column(name)]:
                raise LoaderError(f"{where}: empty {name}")
        key = tuple(row[table.column(name)] for name in key_columns)
        if key in out:
            raise LoaderError(f"{where}: duplicate row for {key!r}")
        label = row[table.column("location_label")].removeprefix(_DLC_TAG)
        out[key] = (row[table.column("boss")], label)
    if not out:
        raise LoaderError(f"{path}: no rows")
    return out
