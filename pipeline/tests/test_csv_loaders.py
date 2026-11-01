"""Tests for the ten CSV loaders.

Row counts are the ones recorded in `data.md` §7.2; they double as a regression suite for
the raw sources. When `raw/` is absent (a public checkout) the data tests skip.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

import pytest

from eldenrando.loaders.bosses import load_boss_creature_locations, load_boss_summary
from eldenrando.loaders.consumables import load_consumable_categories
from eldenrando.loaders.csv_source import CsvTable, read_table
from eldenrando.loaders.drops import load_drop_locations, load_item_drops
from eldenrando.loaders.schema import LoaderError
from eldenrando.loaders.spells import load_spell_table
from eldenrando.loaders.weapons import (
    load_ash_compatibility,
    load_somber_weapons,
    load_weapon_categories,
)

CSV_DIR = Path(__file__).resolve().parents[2] / "raw" / "csv"
needs_data = pytest.mark.skipif(not CSV_DIR.is_dir(), reason="raw source data not present")

TABLES: list[tuple[Callable[[Path], CsvTable], str, int]] = [
    (load_drop_locations, "item_drop_locations.csv", 3254),
    (load_item_drops, "item_drops.csv", 4896),
    (load_boss_creature_locations, "boss_creature_locations.csv", 3254),
    (load_weapon_categories, "weapons_shields_categories.csv", 530),
    (load_consumable_categories, "tools_consumables_categories.csv", 90),
    (load_ash_compatibility, "ashes_compatibility_no_DLC.csv", 91),
    (load_somber_weapons, "ashes_somber_weapons.csv", 2654),
    (load_spell_table, "spells.csv", 523),
    (load_boss_summary, "bosses_with_locations_levels_runes_item_drops.csv", 158),
    (load_boss_summary, "bosses_with_locations_levels_runes_item_drops_2.csv", 20),
]


@needs_data
@pytest.mark.parametrize(("loader", "filename", "expected"), TABLES)
def test_csv_row_count(loader: Callable[[Path], CsvTable], filename: str, expected: int) -> None:
    assert loader(CSV_DIR / filename).row_count == expected


@needs_data
def test_every_row_matches_the_header_width() -> None:
    for loader, filename, _ in TABLES:
        table = loader(CSV_DIR / filename)
        assert all(len(row) == len(table.header) for row in table.rows), filename


@needs_data
def test_boss_table_starts_after_the_legend_line() -> None:
    table = load_boss_creature_locations(CSV_DIR / "boss_creature_locations.csv")

    assert table.header_row == 1
    assert table.column("Location") == 0
    assert table.column("Name") == 1
    assert table.rows[0][:2] == ("Abandoned Cave", "Cleanrot Knight [Boss] (Sickle)")


@needs_data
def test_weapon_table_keeps_class_separators() -> None:
    table = load_weapon_categories(CSV_DIR / "weapons_shields_categories.csv")
    class_column = table.column("Weapon Class")
    classes = {row[class_column] for row in table.rows if any(row)}

    assert table.blank_row_count == 42
    assert len(classes) == 42


@needs_data
def test_drop_location_header_has_one_blank_column() -> None:
    table = load_drop_locations(CSV_DIR / "item_drop_locations.csv")

    assert table.header.count("") == 1


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
