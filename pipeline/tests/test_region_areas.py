"""Tests for the authored area → region map.

Area names come from `areas.yaml`; the per-region slot counts here are
the record, recomputed from `item_slots.yaml`.
"""

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


def test_duplicate_area_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text("area,region_id\nlimgrave,limgrave\nlimgrave,liurnia\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="duplicate area 'limgrave'"):
        load_region_areas(source, region_ids={"limgrave", "liurnia"})


def test_unknown_region_id_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text("area,region_id\nlimgrave,moon\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="unknown region_id 'moon'"):
        load_region_areas(source, region_ids={"limgrave"})


def test_empty_area_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text("area,region_id\n,limgrave\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="data row 1: empty area"):
        load_region_areas(source, region_ids={"limgrave"})


def test_empty_region_id_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text("area,region_id\nlimgrave,\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="data row 1: empty region_id"):
        load_region_areas(source, region_ids={"limgrave"})


def test_missing_column_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "region_areas.csv"
    source.write_text("area\nlimgrave\n", encoding="utf-8")

    with pytest.raises(LoaderError, match="missing column 'region_id'"):
        load_region_areas(source, region_ids={"limgrave"})
