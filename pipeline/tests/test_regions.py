"""Tests for the authored region seed.

The expected ids, names and levels here are the record; no doc repeats them.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.regions import load_regions
from eldenroll.loaders.schema import LoaderError

REGIONS_CSV = Path(__file__).resolve().parents[2] / "data" / "overrides" / "regions.csv"

EXPECTED: list[tuple[str, str, int]] = [
    ("limgrave", "Limgrave, Weeping Peninsula & Siofra", 1),
    ("liurnia", "Liurnia, Mohgwyn & Ainsel Downstream", 30),
    ("caelid", "Caelid & Dragonbarrow", 50),
    ("altus", "Altus Plateau & Mt. Gelmir", 60),
    ("nokron", "Nokron & Deeproot Depths", 65),
    ("ainsel", "Ainsel Main, Nokstella, Lake of Rot & Moonlight Altar", 70),
    ("leyndell", "Leyndell, Royal Capital & Shunning-Grounds", 80),
    ("mountaintops", "Mountaintops of the Giants", 100),
    ("farumazula", "Crumbling Farum Azula", 110),
    ("snowfield", "Consecrated Snowfield", 115),
    ("haligtree", "Miquella's Haligtree", 120),
    ("leyndell_ashen", "Leyndell, Ashen Capital & Shunning-Grounds", 130),
    ("dlc_gravesite", "DLC: Gravesite Plain, Scadu Altus & Rauh Base", 140),
    ("dlc_shadowkeep", "DLC: Shadow Keep, Storehouse & Rauh Ruins", 150),
    ("dlc_jaggedpeak", "DLC: Jagged Peak & Charo", 155),
    ("dlc_abyssal", "DLC: Abyssal Woods & Midra's Manse", 160),
    ("dlc_enirilim", "DLC: Enir-Ilim", 165),
]


def test_region_seed_matches_the_documented_rows() -> None:
    regions = load_regions(REGIONS_CSV)

    assert [(region.id, region.name, region.region_level) for region in regions] == EXPECTED


def test_region_levels_are_unique_and_ascending() -> None:
    levels = [region.region_level for region in load_regions(REGIONS_CSV)]

    assert levels == sorted(levels)
    assert len(set(levels)) == len(levels)


def test_dlc_split_is_twelve_and_five() -> None:
    regions = load_regions(REGIONS_CSV)
    base = [region for region in regions if not region.is_dlc]
    dlc = [region for region in regions if region.is_dlc]

    assert len(base) == 12
    assert len(dlc) == 5
    assert [region.region_level for region in dlc] == [140, 150, 155, 160, 165]
    assert all(region.name.startswith("DLC: ") for region in dlc)


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
