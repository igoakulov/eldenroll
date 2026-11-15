"""Tests for the four source loaders.

The expected numbers are the ones measured in `PARSER_SURVEY.md`; they double as a
regression suite for the committed sources.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.itemslots import extract_items
from eldenroll.loaders.schema import LoaderError
from eldenroll.loaders.yaml_source import load_mapping
from eldenroll.paths import AREAS
from eldenroll.validate.gaps import GapSources


def test_annotations_specific_records() -> None:
    config = load_annotations(AREAS)
    areas = config.area_by_name()

    assert areas["chapel_start"].req is None
    assert areas["caelid_postradahn"].maps == ()
    assert areas["leyndell"].until == "ashen"
    assert sum(1 for area in config.areas if area.until is not None) == 1
    assert areas["stormveil"].is_dlc is False
    assert areas["belurat"].is_dlc is True
    assert areas["graveyard"].tags == ("minidungeon", "cave")


def test_slot_item_extraction(sources: GapSources) -> None:
    slots = sources.slots

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


def test_slot_areas_are_known(sources: GapSources) -> None:
    config = load_annotations(AREAS)
    slots = sources.slots
    known = {area.name for area in config.areas}

    used = {slot.area for slot in slots if slot.is_randomizable}
    assert used <= known
    assert {slot.area for slot in slots} - known == {"unknown"}


def test_slot_events_are_known(sources: GapSources) -> None:
    config = load_annotations(AREAS)
    slots = sources.slots
    known = {event.name for event in config.events}

    used = {slot.event for slot in slots if slot.event is not None}
    assert used <= known


def test_catalog_finds_an_item_by_name(sources: GapSources) -> None:
    catalog = sources.catalog
    assert catalog.find("Godrick's Great Rune") == ("goods", 8148)
    assert catalog.find("Not An Item") is None


def test_missing_file_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="cannot read"):
        load_mapping(tmp_path / "absent.txt")


def test_unexpected_field_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "annotations.txt"
    source.write_text(
        "Areas:\n- Name: limgrave\n  Text: Limgrave\n  Surprise: yes\nEvents: []\n",
        encoding="utf-8",
    )
    with pytest.raises(LoaderError, match="unexpected field"):
        load_annotations(source)


def test_missing_required_field_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "annotations.txt"
    source.write_text("Areas:\n- Name: limgrave\nEvents: []\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=r"Areas\[0\]\.Text"):
        load_annotations(source)
