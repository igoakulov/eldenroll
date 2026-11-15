"""Tests for the authored region seed.

The expected ids, names and levels here are the record; no doc repeats them.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError


def test_duplicate_region_id_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name,region_level\na,One,1\na,Two,2\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="duplicate region id 'a'"):
        load_regions(source)


def test_duplicate_region_level_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name,region_level\na,One,1\nb,Two,1\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="region_level 1 is used by both 'a' and 'b'"):
        load_regions(source)


def test_descending_region_level_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name,region_level\na,One,30\nb,Two,1\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="region_level 1 at 'b' does not follow 30 at 'a'"):
        load_regions(source)


def test_non_integer_region_level_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name,region_level\na,One,early\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="region_level 'early' is not an integer"):
        load_regions(source)


def test_empty_region_name_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name,region_level\na,,1\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="data row 1: empty region name"):
        load_regions(source)


def test_missing_column_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "regions.csv"
    source.write_text("id,name\na,One\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing column 'region_level'"):
        load_regions(source)
