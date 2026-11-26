"""The shared CSV reader stops on a malformed file, as a hand-edited override can be."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.schema import LoaderError


def test_ragged_row_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("Name,Value\none,1,2\n", encoding="utf-8")

    with pytest.raises(LoaderError, match=r"data row 1 has 3 fields, expected 2"):
        read_table(source)


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


def test_byte_order_mark_is_stripped(tmp_path: Path) -> None:
    source = tmp_path / "table.csv"
    source.write_text("\ufeffName,Value\none,1\n", encoding="utf-8")

    table = read_table(source)

    assert table.header == ("Name", "Value")
