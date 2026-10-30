"""Tests for the four source loaders.

The expected numbers are the ones measured in `PARSER_SURVEY.md`; they double as a
regression suite for the raw sources. When `raw/` is absent (a public checkout) the data
tests skip instead of failing.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.loaders.annotations import load_annotations
from eldenrando.loaders.hintmarks import load_hintmarks
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.itemslots import extract_items, load_slots
from eldenrando.loaders.schema import LoaderError
from eldenrando.loaders.yaml_source import load_mapping

DATA_DIR = Path(__file__).resolve().parents[2] / "raw" / "pc_mod_data"
needs_data = pytest.mark.skipif(not DATA_DIR.is_dir(), reason="raw source data not present")


@needs_data
def test_annotations_counts() -> None:
    config = load_annotations(DATA_DIR / "annotations_stable.txt")
    assert len(config.areas) == 174
    assert len({area.name for area in config.areas}) == 174
    assert len(config.events) == 46
    assert len({event.name for event in config.events}) == 46


@needs_data
def test_annotations_specific_records() -> None:
    config = load_annotations(DATA_DIR / "annotations_stable.txt")
    areas = config.area_by_name()

    assert areas["chapel_start"].req is None
    assert areas["caelid_postradahn"].maps == ()
    assert areas["leyndell"].until == "ashen"
    assert sum(1 for area in config.areas if area.until is not None) == 1
    assert areas["stormveil"].is_dlc is False
    assert areas["belurat"].is_dlc is True
    assert areas["graveyard"].tags == ("minidungeon", "cave")


@needs_data
def test_slot_counts() -> None:
    slots = load_slots(DATA_DIR / "itemslots_stable.txt")

    assert len(slots) == 4379
    assert len({slot.key for slot in slots}) == 4379
    assert all(slot.debug_lines for slot in slots)
    assert all(slot.items for slot in slots)

    randomizable = [slot for slot in slots if slot.is_randomizable]
    assert len(slots) - len(randomizable) == 122
    assert len(randomizable) == 4257


@needs_data
def test_slot_item_extraction() -> None:
    slots = load_slots(DATA_DIR / "itemslots_stable.txt")

    assert sum(len(slot.items) for slot in slots) == 5363
    assert len({name for slot in slots for name in slot.items}) == 2262

    boss_rune = next(slot for slot in slots if slot.event == "godrick")
    assert boss_rune.items == ("Godrick's Great Rune",)
    assert boss_rune.tags == (
        "boss",
        "deadend",
        "exclude:chrysalidsmemento",
        "remembranceboss",
    )
    assert boss_rune.is_randomizable
    assert boss_rune.until is None


def test_extract_items_ignores_prose() -> None:
    lines = (
        "Golden Rune [1] - lot 100000[asset AEG099_090_9000 (Corpse)] Golden Rune [1]",
        "By Church of Elleh (Limgrave) - 20.34 away, 10.24 o'clock, 1.35 height offset",
        "Unique location in [m11_10_00_00 (Roundtable Hold)]",
        "Church of Vows), m60_37_46_00 (Liurnia of the Lakes - Church of Vows)",
        "Ash of War: Spinning Weapon - shop 100200[enemy c0000_9022 ...] 1x for 1000 runes",
    )
    assert extract_items(lines) == ("Golden Rune [1]", "Ash of War: Spinning Weapon")


@needs_data
def test_slot_areas_are_known() -> None:
    config = load_annotations(DATA_DIR / "annotations_stable.txt")
    slots = load_slots(DATA_DIR / "itemslots_stable.txt")
    known = {area.name for area in config.areas}

    used = {slot.area for slot in slots if slot.is_randomizable}
    assert used <= known
    assert {slot.area for slot in slots} - known == {"unknown"}


@needs_data
def test_slot_events_are_known() -> None:
    config = load_annotations(DATA_DIR / "annotations_stable.txt")
    slots = load_slots(DATA_DIR / "itemslots_stable.txt")
    known = {event.name for event in config.events}

    used = {slot.event for slot in slots if slot.event is not None}
    assert used <= known


@needs_data
def test_catalog_counts() -> None:
    catalog = load_item_catalog(DATA_DIR / "iteminfo.txt")
    names = [name for entries in catalog.names.values() for name in entries.values()]

    assert len(names) == 2448
    assert len(set(names)) == 2448
    assert len(catalog.groups) == 29
    assert len({location.tags for location in catalog.locations}) > 1
    assert len(catalog.locations) == 236
    assert catalog.find("Godrick's Great Rune") == ("goods", 8148)
    assert catalog.find("Not An Item") is None
    assert catalog.groups["weapons"].item_count > 0


@needs_data
def test_hintmarks_counts() -> None:
    hintmarks = load_hintmarks(DATA_DIR / "hintmarks.txt")

    assert len(hintmarks.debug_info) == 324
    assert len(hintmarks.groups) == 129
    assert len(hintmarks.items) == 20
    assert len(hintmarks.upgrades) == 10
    assert hintmarks.enable_flag > 0
    assert hintmarks.groups[0].includes == ("graveyard", "graveyard_cave")
    assert hintmarks.groups[0].main_bonfire == "Stranded Graveyard"
    assert hintmarks.items[0].name == "academyglintstonekey"


def test_missing_file_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="cannot read"):
        load_mapping(tmp_path / "absent.txt")


def test_unexpected_field_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "annotations.txt"
    source.write_text(
        "Areas:\n"
        "- Name: limgrave\n"
        "  Text: Limgrave\n"
        "  Surprise: yes\n"
        "Events: []\n",
        encoding="utf-8",
    )
    with pytest.raises(LoaderError, match="unexpected field"):
        load_annotations(source)


def test_missing_required_field_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "annotations.txt"
    source.write_text("Areas:\n- Name: limgrave\nEvents: []\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=r"Areas\[0\]\.Text"):
        load_annotations(source)
