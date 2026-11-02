"""Tests for `data/gaps.csv` and the checks that hold it to the sources (`data.md` §10)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import cast

import pytest

from eldenrando.loaders.gaps import COLUMNS, load_gaps, write_gaps
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.gap import Gap
from eldenrando.model.item import Item
from eldenrando.validate.gaps import (
    GapSources,
    add_missing,
    find_gaps,
    item_origin,
    load_overrides,
    load_sources,
    reconcile,
    requirement_gaps,
)

ROOT = Path(__file__).resolve().parents[2]
GAPS = ROOT / "data" / "gaps.csv"
ITEMINFO = ROOT / "raw" / "pc_mod_data" / "iteminfo.txt"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")

GAP = Gap(
    area="requirements",
    item="Pata",
    origin="dlc",
    problem="no stat record",
    found_by="check",
    step="2.5.3",
    owner="both",
)


@pytest.fixture(scope="module")
def sources() -> GapSources:
    return load_sources(ROOT)


@pytest.fixture(scope="module")
def found(sources: GapSources) -> tuple[Gap, ...]:
    return find_gaps(sources)


def _item(sources: GapSources, name: str) -> Item:
    return next(item for item in sources.table if item.name == name)


@needs_files
def test_the_list_agrees_with_the_checks_and_overrides(found: tuple[Gap, ...]) -> None:
    tracked = load_gaps(GAPS)
    assert reconcile(found, tracked, load_overrides(ROOT / "data" / "overrides")) == ()


def test_the_file_is_written_the_way_the_writer_writes_it(tmp_path: Path) -> None:
    written = tmp_path / "gaps.csv"
    write_gaps(written, load_gaps(GAPS))
    assert written.read_text(encoding="utf-8") == GAPS.read_text(encoding="utf-8")


@needs_files
@pytest.mark.parametrize(
    ("area", "count"),
    [
        ("requirements", 162),
        ("holds_ash", 41),
        ("ash_usable_on", 23),
        ("class_ashes", 8),
        ("remembrance_boss", 25),
    ],
)
def test_area_holds_the_gaps_found_at_the_audit(
    found: tuple[Gap, ...], area: str, count: int
) -> None:
    assert sum(gap.area == area for gap in found) == count


@needs_files
@pytest.mark.parametrize(
    ("name", "origin"),
    [
        ("Bandit's Curved Sword", "base"),
        ("Inseparable Sword", "base"),
        ("Gravel Stone Seal", "base"),
        ("Serpent-Hunter", "base"),
        ("Catch Flame", "base"),
        ("Hefty Scimitar", "tarnished"),
        ("Reed Great Katana", "tarnished"),
        ("Pata", "dlc"),
        ("Sword of Light", "dlc"),
        ("Glintblade Trio", "dlc"),
        ("Dryleaf Whirlwind", "dlc"),
    ],
)
def test_item_origin(sources: GapSources, name: str, origin: str) -> None:
    assert item_origin(_item(sources, name), sources.catalog, sources.variants) == origin


@needs_files
def test_every_weapon_in_the_base_game_files_reads_as_base_or_tarnished(
    sources: GapSources,
) -> None:
    names: set[str] = set()
    for document in ("weapons", "shields"):
        for record in sources.requirement_records[document]:
            variant = sources.variants.get(cast("str", record["id"]))
            name = cast("str", record["name"]) if variant is None else variant.canonical_name
            names.add(name.casefold())
    origins = {
        item.name: item_origin(item, sources.catalog, sources.variants)
        for item in sources.table
        if item.category in ("weapon", "shield") and item.name.casefold() in names
    }
    assert [name for name, origin in origins.items() if origin == "dlc"] == []


@needs_files
@pytest.mark.parametrize(
    "name",
    [
        "Siluria's Tree",
        "Serpent-Hunter",
        "Clayman's Harpoon",
        "Glintstone Breath",
        "Oracle Bubbles",
    ],
)
def test_broken_stat_record_is_a_gap(found: tuple[Gap, ...], name: str) -> None:
    assert ("requirements", name) in {gap.key for gap in found}


@needs_files
def test_base_game_weapon_off_the_sheet_is_not_asked_about(found: tuple[Gap, ...]) -> None:
    asked = {gap.item for gap in found if gap.area == "holds_ash"}
    assert not asked & {"Bandit's Curved Sword", "Inseparable Sword", "Dragon Halberd"}


@needs_files
def test_every_enia_remembrance_is_a_gap(found: tuple[Gap, ...]) -> None:
    asked = {gap.item for gap in found if gap.area == "remembrance_boss"}
    assert {"Remembrance of the Omen King", "Elden Remembrance"} <= asked


@needs_files
def test_stat_records_of_one_item_may_repeat_if_they_agree(sources: GapSources) -> None:
    assert ("requirements", "Ekzykes's Decay") not in {gap.key for gap in requirement_gaps(sources)}


def test_gap_without_a_row_is_reported() -> None:
    assert reconcile([GAP], [], {}) == ("requirements 'Pata' has no row",)


def test_row_whose_gap_went_away_is_reported() -> None:
    assert reconcile([], [GAP], {}) == (
        "requirements 'Pata' is open, but the check no longer finds it",
    )


def test_manual_row_needs_no_check() -> None:
    assert reconcile([], [replace(GAP, found_by="manual")], {}) == ()


def test_wrong_origin_is_reported() -> None:
    assert reconcile([GAP], [replace(GAP, origin="base")], {}) == (
        "requirements 'Pata' is dlc, the row says base",
    )


def test_applied_row_needs_its_override() -> None:
    row = replace(GAP, status="applied", answer="STR 10", source="wiki")
    assert reconcile([], [row], {}) == (
        "requirements 'Pata' is applied, but requirements.csv lacks it",
    )
    assert reconcile([], [row], {"requirements": frozenset({"Pata"})}) == ()


def test_add_missing_keeps_what_a_person_wrote() -> None:
    answered = replace(GAP, status="answered", answer="STR 10", source="owner")
    other = replace(GAP, item="Bone Bow")
    assert add_missing([GAP, other], [answered]) == (answered, other)


def _write(path: Path, **cells: str) -> None:
    row = {
        "area": "requirements",
        "item": "Pata",
        "origin": "dlc",
        "problem": "no stat record",
        "found_by": "check",
        "step": "2.5.3",
        "owner": "both",
        "status": "open",
        "answer": "",
        "source": "",
        **cells,
    }
    path.write_text(
        ",".join(COLUMNS) + "\n" + ",".join(row[name] for name in COLUMNS) + "\n",
        encoding="utf-8",
    )


@pytest.mark.parametrize(
    ("cells", "message"),
    [
        ({"area": "nope"}, "area is"),
        ({"origin": "nope"}, "origin is"),
        ({"found_by": "nope"}, "found_by is"),
        ({"owner": "nope"}, "owner is"),
        ({"status": "nope"}, "status is"),
        ({"problem": ""}, "empty problem"),
        ({"status": "answered"}, "needs an answer"),
        ({"status": "applied", "answer": "STR 10"}, "needs an answer"),
    ],
)
def test_bad_row_stops_the_load(tmp_path: Path, cells: dict[str, str], message: str) -> None:
    path = tmp_path / "gaps.csv"
    _write(path, **cells)
    with pytest.raises(LoaderError, match=message):
        load_gaps(path)


def test_open_row_may_hold_a_proposal(tmp_path: Path) -> None:
    path = tmp_path / "gaps.csv"
    _write(path, answer="STR 10")
    assert load_gaps(path)[0].answer == "STR 10"


def test_repeated_row_stops_the_load(tmp_path: Path) -> None:
    path = tmp_path / "gaps.csv"
    write_gaps(path, [GAP])
    data_row = path.read_text(encoding="utf-8").splitlines()[1]
    path.write_text(path.read_text(encoding="utf-8") + data_row + "\n", encoding="utf-8")
    with pytest.raises(LoaderError, match="duplicate"):
        load_gaps(path)
