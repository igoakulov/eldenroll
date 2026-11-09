"""Tests for the authored area → region map.

Area names come from `areas.yaml`; per-region slot counts are the ones recorded
in `data.md` §3.2 and are recomputed from `item_slots.yaml`.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.itemslots import load_slots
from eldenroll.loaders.region_areas import load_region_areas
from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError
from eldenroll.paths import AREAS, ITEM_SLOTS

ROOT = Path(__file__).resolve().parents[2]
REGIONS_CSV = ROOT / "data" / "overrides" / "regions.csv"
AREAS_CSV = ROOT / "data" / "overrides" / "region_areas.csv"

EXPECTED_AREAS: dict[int, int] = {
    1: 27,
    30: 22,
    50: 16,
    60: 21,
    65: 5,
    70: 4,
    80: 10,
    100: 7,
    110: 2,
    115: 5,
    120: 2,
    130: 3,
    140: 25,
    150: 15,
    155: 6,
    160: 2,
    165: 2,
}
EXPECTED_SLOTS: dict[int, int] = {
    1: 689,
    30: 648,
    50: 315,
    60: 549,
    65: 151,
    70: 108,
    80: 233,
    100: 179,
    110: 94,
    115: 123,
    120: 104,
    130: 13,
    140: 621,
    150: 285,
    155: 57,
    160: 36,
    165: 52,
}


def _region_ids() -> dict[str, int]:
    return {region.id: region.region_level for region in load_regions(REGIONS_CSV)}


def test_every_annotation_area_is_mapped_once() -> None:
    region_ids = _region_ids()
    areas = load_region_areas(AREAS_CSV, region_ids=region_ids)
    known = {area.name for area in load_annotations(AREAS).areas}

    assert len(areas) == 174
    assert set(areas) == known
    assert set(areas.values()) == set(region_ids)


def test_area_counts_per_region_match_the_document() -> None:
    region_ids = _region_ids()
    areas = load_region_areas(AREAS_CSV, region_ids=region_ids)
    counts = Counter(areas.values())

    assert {level: counts[region_id] for region_id, level in region_ids.items()} == EXPECTED_AREAS


def test_slot_counts_per_region_match_the_document() -> None:
    region_ids = _region_ids()
    areas = load_region_areas(AREAS_CSV, region_ids=region_ids)
    slots = load_slots(ITEM_SLOTS)
    per_area = Counter(slot.area for slot in slots if slot.is_randomizable)

    assert all(area in per_area for area in areas)
    per_region = {
        level: sum(per_area[area] for area, region_id in areas.items() if region_id == region)
        for region, level in region_ids.items()
    }
    assert per_region == EXPECTED_SLOTS
    assert sum(per_region.values()) == 4257


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
