"""Tests for the authored region seed: a mistake in it stops the load."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("a,One,1\na,Two,2\n", "duplicate region id 'a'"),
        ("a,One,1\nb,Two,1\n", "region_level 1 is used by both 'a' and 'b'"),
        ("a,One,30\nb,Two,1\n", "region_level 1 at 'b' does not follow 30 at 'a'"),
        ("a,One,early\n", "region_level 'early' is not an integer"),
        ("a,,1\n", "data row 1: empty region name"),
    ],
)
def test_bad_region_row_is_a_loader_error(tmp_path: Path, body: str, message: str) -> None:
    source = tmp_path / "regions.csv"
    source.write_text(f"id,name,region_level\n{body}", encoding="utf-8")

    with pytest.raises(LoaderError, match=message):
        load_regions(source)
