"""Each row names a boss instance by its name and label, because a name can repeat across labels. A
label may keep the boss CSV's `[DLC] ` prefix.
"""

from __future__ import annotations

from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError

_DLC_TAG = "[DLC] "
_BOSS_COLUMNS: tuple[str, ...] = ("boss", "location_label", "reason")

BossPlace = tuple[str, str]


def load_remembrance_bosses(path: Path) -> dict[str, BossPlace]:
    return {key[0]: place for key, place in _load(path, ("remembrance",)).items()}


def load_armor_shop_bosses(path: Path) -> dict[str, BossPlace]:
    """Return `{name after 'after defeating' on Enia's slot line: (boss, label)}`."""
    return {key[0]: place for key, place in _load(path, ("defeated",)).items()}


def load_slot_links(path: Path) -> dict[tuple[str, str], tuple[BossPlace, ...]]:
    """Return `{(item, area): each (boss, label) that opens it}`."""
    links: dict[tuple[str, str], tuple[BossPlace, ...]] = {}
    for key, place in _load(path, ("item", "area", "boss", "location_label")).items():
        links[key[0], key[1]] = (*links.get((key[0], key[1]), ()), place)
    return links


def _load(path: Path, key_columns: tuple[str, ...]) -> dict[tuple[str, ...], BossPlace]:
    columns = tuple(dict.fromkeys((*key_columns, *_BOSS_COLUMNS)))
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
