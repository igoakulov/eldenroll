"""Tests for the authored area → region map (`data/overrides/README.md#Regions`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.region_areas import load_region_areas
from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError
from eldenroll.paths import AREAS

ROOT = Path(__file__).resolve().parents[2]
REGIONS_CSV = ROOT / "data" / "overrides" / "regions.csv"
AREAS_CSV = ROOT / "data" / "overrides" / "region_areas.csv"


def _region_ids() -> dict[str, int]:
    return {region.id: region.region_level for region in load_regions(REGIONS_CSV)}


def test_every_annotation_area_is_mapped_once() -> None:
    region_ids = _region_ids()
    areas = load_region_areas(AREAS_CSV, region_ids=region_ids)
    known = {area.name for area in load_annotations(AREAS).areas}

    assert set(areas) == known
    assert set(areas.values()) == set(region_ids)


@pytest.mark.parametrize("area", ["chapel", "siofra_limited", "farumazula_limited", "mohgwyn"])
def test_places_reached_only_from_liurnia_are_in_liurnia(area: str) -> None:
    areas = load_region_areas(AREAS_CSV, region_ids=_region_ids())

    assert areas[area] == "liurnia"


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("limgrave,limgrave\nlimgrave,liurnia\n", "duplicate area 'limgrave'"),
        ("limgrave,moon\n", "unknown region_id 'moon'"),
        (",limgrave\n", "data row 1: empty area"),
        ("limgrave,\n", "data row 1: empty region_id"),
    ],
)
def test_bad_area_row_is_a_loader_error(tmp_path: Path, body: str, message: str) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text(f"area,region_id\n{body}", encoding="utf-8")

    with pytest.raises(LoaderError, match=message):
        load_region_areas(source, region_ids={"limgrave", "liurnia"})
