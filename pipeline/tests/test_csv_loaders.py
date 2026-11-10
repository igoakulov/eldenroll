"""Tests for the seven CSV loaders.

The row counts here are the record; no doc repeats them. They double as a regression suite
for the committed sources.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

import pytest

from eldenroll.loaders.bosses import load_boss_creature_locations
from eldenroll.loaders.consumables import load_consumable_categories
from eldenroll.loaders.csv_source import CsvTable, read_table
from eldenroll.loaders.drops import load_drop_locations, load_item_drops
from eldenroll.loaders.schema import LoaderError
from eldenroll.loaders.weapons import (
    load_ash_compatibility,
    load_somber_weapons,
    load_weapon_categories,
)
from eldenroll.paths import (
    ASH_WEAPON_MATRIX,
    ENEMY_DROPS,
    ENEMY_ITEM_LOTS,
    ENEMY_LOCATIONS,
    TOOL_CONSUMABLE_CLASSES,
    WEAPON_SHIELD_CLASSES,
    WEAPON_SKILLS,
)

TABLES: list[tuple[Callable[[Path], CsvTable], Path, int]] = [
    (load_drop_locations, ENEMY_DROPS, 3254),
    (load_item_drops, ENEMY_ITEM_LOTS, 4896),
    (load_boss_creature_locations, ENEMY_LOCATIONS, 3254),
    (load_weapon_categories, WEAPON_SHIELD_CLASSES, 530),
    (load_consumable_categories, TOOL_CONSUMABLE_CLASSES, 90),
    (load_ash_compatibility, ASH_WEAPON_MATRIX, 91),
    (load_somber_weapons, WEAPON_SKILLS, 2654),
]


@pytest.mark.parametrize(("loader", "path", "expected"), TABLES)
def test_csv_row_count(loader: Callable[[Path], CsvTable], path: Path, expected: int) -> None:
    assert loader(path).row_count == expected


def test_every_row_matches_the_header_width() -> None:
    for loader, path, _ in TABLES:
        table = loader(path)
        assert all(len(row) == len(table.header) for row in table.rows), path


def test_boss_table_starts_after_the_legend_line() -> None:
    table = load_boss_creature_locations(ENEMY_LOCATIONS)

    assert table.header_row == 1
    assert table.column("Location") == 0
    assert table.column("Name") == 1
    assert table.rows[0][:2] == ("Abandoned Cave", "Cleanrot Knight [Boss] (Sickle)")


def test_weapon_table_keeps_class_separators() -> None:
    table = load_weapon_categories(WEAPON_SHIELD_CLASSES)
    weapon_class_column = table.column("Weapon Class")
    weapon_classes = {row[weapon_class_column] for row in table.rows if any(row)}

    assert table.blank_row_count == 42
    assert len(weapon_classes) == 42


def test_missing_csv_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="cannot read"):
        read_table(tmp_path / "absent.csv")


def test_ragged_row_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name,Value\none,1,2\n", encoding="utf-8")

    with pytest.raises(LoaderError, match=r"data row 1 has 3 fields, expected 2"):
        read_table(source)


def test_missing_header_row_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name,Value\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing header row 2"):
        read_table(source, header_row=1)


def test_missing_column_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name,Value\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing column 'Location'"):
        read_table(source, required_columns=("Location",))


def test_duplicate_column_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name,Name\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="column 'Name' appears 2 times"):
        read_table(source, required_columns=("Name",))


def test_column_lookup_rejects_an_unknown_name(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name\none\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing column 'Value'"):
        read_table(source).column("Value")


def test_byte_order_mark_is_stripped(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("\ufeffName,Value\none,1\n", encoding="utf-8")

    table = read_table(source)

    assert table.header == ("Name", "Value")
