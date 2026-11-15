"""Tests for the location table and the region invariants across it
(`data/overrides/README.md#Regions`)."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from eldenroll.build.locations import build_locations
from eldenroll.errors import BuildError
from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.region_areas import load_region_areas
from eldenroll.loaders.regions import load_regions
from eldenroll.model.annotations import Area
from eldenroll.model.location import Location
from eldenroll.model.region import Region
from eldenroll.paths import AREAS
from eldenroll.validate.regions import validate_region_dlc_prefix, validate_region_membership

ROOT = Path(__file__).resolve().parents[2]
REGIONS_CSV = ROOT / "data" / "overrides" / "regions.csv"
AREAS_CSV = ROOT / "data" / "overrides" / "region_areas.csv"

BASE = Region(id="base", name="Base", region_level=1)
DLC = Region(id="dlc", name="DLC: Land", region_level=2)


def _area(name: str, text: str = "Text") -> Area:
    return Area(
        name=name,
        text=text,
        req=None,
        maps=(),
        main_maps=(),
        tags=(),
        until=None,
        comment=None,
        map_names=(),
    )


def _location(location_id: str, region_id: str) -> Location:
    return Location(id=location_id, name="Text", region_id=region_id)


def _real_rows() -> tuple[tuple[Region, ...], tuple[Location, ...], set[str]]:
    regions = load_regions(REGIONS_CSV)
    region_areas = load_region_areas(AREAS_CSV, region_ids={region.id for region in regions})
    areas = load_annotations(AREAS).areas
    dlc_ids = {area.name for area in areas if area.is_dlc}
    return regions, build_locations(areas, region_areas), dlc_ids


def test_location_table_has_one_row_per_area_in_one_region() -> None:
    regions, locations, _ = _real_rows()
    region_ids = {region.id for region in regions}

    assert len({location.id for location in locations}) == len(locations)
    assert all(location.name for location in locations)
    assert all(location.region_id in region_ids for location in locations)
    validate_region_membership(regions, locations)


def test_location_rows_match_the_documented_instances() -> None:
    _, locations, _ = _real_rows()
    by_id = {location.id: location for location in locations}

    assert by_id["stormhill"] == Location("stormhill", "Stormhill", "limgrave")
    assert by_id["academy"] == Location("academy", "Academy of Raya Lucaria", "liurnia")
    assert by_id["academy_courtyard"].name == "Academy of Raya Lucaria"
    assert Counter(location.name for location in locations)["Academy of Raya Lucaria"] == 4


def test_real_dlc_prefix_matches_the_annotation_tags() -> None:
    regions, locations, dlc_ids = _real_rows()

    validate_region_dlc_prefix(regions, locations, dlc_location_ids=dlc_ids)
    dlc_regions = {region.id for region in regions if region.is_dlc}
    assert {location.id for location in locations if location.region_id in dlc_regions} == dlc_ids


def test_build_keeps_area_name_text_and_region() -> None:
    rows = build_locations([_area("a", "Label")], {"a": "base"})

    assert rows == (Location(id="a", name="Label", region_id="base"),)


def test_area_without_a_region_stops_the_build() -> None:
    with pytest.raises(BuildError, match="area 'a' has no region"):
        build_locations([_area("a")], {})


def test_region_row_for_an_unknown_area_stops_the_build() -> None:
    with pytest.raises(BuildError, match=r"unknown area.*: ghost"):
        build_locations([_area("a")], {"a": "base", "ghost": "base"})


def test_repeated_area_stops_the_build() -> None:
    with pytest.raises(BuildError, match="duplicate annotation area 'a'"):
        build_locations([_area("a"), _area("a")], {"a": "base"})


def test_location_in_an_unknown_region_fails() -> None:
    with pytest.raises(BuildError, match=r"unknown region.*: moon"):
        validate_region_membership([BASE], [_location("a", "base"), _location("b", "moon")])


def test_region_without_a_location_fails() -> None:
    with pytest.raises(BuildError, match="hold no location: dlc"):
        validate_region_membership([BASE, DLC], [_location("a", "base")])


def test_region_with_thirty_locations_fails() -> None:
    locations = [_location(f"a{index}", "base") for index in range(30)]

    with pytest.raises(BuildError, match="more than 29 locations: base"):
        validate_region_membership([BASE], locations)


def test_region_with_twenty_nine_locations_passes() -> None:
    validate_region_membership([BASE], [_location(f"a{index}", "base") for index in range(29)])


def test_matching_prefix_passes() -> None:
    locations = [_location("a", "base"), _location("b", "dlc")]

    validate_region_dlc_prefix([BASE, DLC], locations, dlc_location_ids={"b"})


def test_dlc_location_in_a_base_named_region_fails() -> None:
    with pytest.raises(BuildError, match="'base' name has the wrong DLC prefix"):
        validate_region_dlc_prefix([BASE], [_location("a", "base")], dlc_location_ids={"a"})


def test_base_location_in_a_dlc_named_region_fails() -> None:
    with pytest.raises(BuildError, match="'dlc' name has the wrong DLC prefix"):
        validate_region_dlc_prefix([DLC], [_location("a", "dlc")], dlc_location_ids=())


def test_region_mixing_dlc_and_base_locations_fails() -> None:
    locations = [_location("a", "base"), _location("b", "base")]

    with pytest.raises(BuildError, match="'base' mixes DLC and base"):
        validate_region_dlc_prefix([BASE], locations, dlc_location_ids={"b"})
