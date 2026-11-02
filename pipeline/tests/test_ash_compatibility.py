"""Tests for ash compatibility against the real sources (`data.md` §4.5)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenrando.build.ash_compatibility import build_ash_compatibility
from eldenrando.build.items import new_item
from eldenrando.errors import BuildError
from eldenrando.loaders.ash_overrides import AshOverride, load_ash_overrides
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.loaders.gaps import load_gaps
from eldenrando.loaders.schema import LoaderError
from eldenrando.model.ash_compatibility import AshCompatibility
from eldenrando.model.item import Item
from eldenrando.validate.ash_compatibility import infusable_without_ashes
from eldenrando.validate.gaps import GapSources, load_sources

ROOT = Path(__file__).resolve().parents[2]
ITEMINFO = ROOT / "raw" / "pc_mod_data" / "iteminfo.txt"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")


@pytest.fixture(scope="module")
def sources() -> GapSources:
    return load_sources(ROOT)


@pytest.fixture(scope="module")
def rows(sources: GapSources) -> dict[str, set[tuple[str, str | None]]]:
    names = {item.id: item.name for item in sources.table}
    out: dict[str, set[tuple[str, str | None]]] = {}
    for row in sources.ash_compatibility:
        out.setdefault(names[row.ash_id], set()).add((row.category, row.subcategory))
    return out


def _sheet(*cells: tuple[str, ...]) -> CsvTable:
    return CsvTable(
        path=Path("sheet.csv"),
        header_row=0,
        header=(
            "Name",
            "Fire",
            "Dagger",
            "Staff",
            "Small Shield",
            "Medium Shield",
            "Greatshield",
            "NONE",
        ),
        rows=cells,
    )


def _ash(name: str) -> Item:
    return new_item(name, "ash")


@needs_files
def test_parry_fits_what_the_docs_say(rows: dict[str, set[tuple[str, str | None]]]) -> None:
    assert rows["Parry"] == {
        ("weapon", "dagger"),
        ("weapon", "curved_sword"),
        ("weapon", "thrusting_sword"),
        ("weapon", "fist"),
        ("weapon", "claw"),
        ("shield", "small_shield"),
        ("shield", "medium_shield"),
    }


@needs_files
@pytest.mark.parametrize(
    "name", ["Carian Retaliation", "Golden Parry", "Storm Wall", "Thops's Barrier"]
)
def test_shield_parry_ash_fits_small_and_medium_shields_only(
    rows: dict[str, set[tuple[str, str | None]]], name: str
) -> None:
    assert rows[name] == {("shield", "small_shield"), ("shield", "medium_shield")}


@needs_files
def test_only_spinning_weapon_fits_staves_and_nothing_fits_seals(
    rows: dict[str, set[tuple[str, str | None]]],
) -> None:
    staves = {name for name, fits in rows.items() if ("weapon", "glintstone_staff") in fits}
    assert staves == {"Spinning Weapon"}
    assert not any(("weapon", "sacred_seal") in fits for fits in rows.values())


@needs_files
@pytest.mark.parametrize("subcategory", ["crossbow", "ballista"])
def test_nothing_fits_the_classes_that_never_hold_an_ash(
    rows: dict[str, set[tuple[str, str | None]]], subcategory: str
) -> None:
    assert not any(("weapon", subcategory) in fits for fits in rows.values())


@needs_files
def test_raging_beast_fits_the_class(rows: dict[str, set[tuple[str, str | None]]]) -> None:
    assert rows["Raging Beast"] == {("weapon", "beast_claw")}


@needs_files
def test_no_row_is_covered_by_a_broader_one(sources: GapSources) -> None:
    whole = {(row.ash_id, row.category) for row in sources.ash_compatibility if not row.subcategory}
    assert whole
    assert not [
        row
        for row in sources.ash_compatibility
        if row.subcategory and (row.ash_id, row.category) in whole
    ]


@needs_files
def test_excluded_ashes_have_no_rows(rows: dict[str, set[tuple[str, str | None]]]) -> None:
    assert not {"Kick", "Lifesteal Fist", "White Shadow's Lure", "Assassin's Gambit"} & set(rows)


@needs_files
def test_weapon_with_no_ash_is_only_in_a_class_the_list_tracks(sources: GapSources) -> None:
    open_classes = {
        gap.item.casefold().replace("-", "_").replace(" ", "_")
        for gap in load_gaps(ROOT / "data" / "gaps.csv")
        if gap.area == "class_ashes" and gap.status == "open"
    }
    missing = infusable_without_ashes(sources.table, sources.ash_compatibility)
    assert {item.subcategory for item in missing} <= open_classes


@needs_files
def test_no_weapon_that_cannot_hold_an_ash_is_reported_missing(sources: GapSources) -> None:
    missing = infusable_without_ashes(sources.table, sources.ash_compatibility)
    assert all(item.infusable for item in missing)


def test_sheet_cells_become_rows() -> None:
    sheet = _sheet(("Parry", "TRUE", "TRUE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"))
    assert build_ash_compatibility([_ash("Parry")], sheet, ()) == (
        AshCompatibility("parry", "shield", "small_shield"),
        AshCompatibility("parry", "weapon", "dagger"),
    )


def test_affinity_and_none_columns_are_not_classes() -> None:
    sheet = _sheet(("A", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE"))
    assert build_ash_compatibility([_ash("A")], sheet, ()) == ()


def test_staff_column_is_the_glintstone_staff_class() -> None:
    sheet = _sheet(("A", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE"))
    assert build_ash_compatibility([_ash("A")], sheet, ()) == (
        AshCompatibility("a", "weapon", "glintstone_staff"),
    )


def test_every_shield_class_becomes_one_row() -> None:
    sheet = _sheet(("A", "FALSE", "FALSE", "FALSE", "TRUE", "TRUE", "TRUE", "FALSE"))
    assert build_ash_compatibility([_ash("A")], sheet, ()) == (
        AshCompatibility("a", "shield", None),
    )


def test_override_for_a_whole_category_absorbs_the_sheets_classes() -> None:
    sheet = _sheet(("A", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"))
    rows = build_ash_compatibility([_ash("A")], sheet, [AshOverride("A", "shield", None)])
    assert rows == (AshCompatibility("a", "shield", None),)


def test_excluded_ash_on_the_sheet_is_skipped() -> None:
    sheet = _sheet(("Kick", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE"))
    assert build_ash_compatibility([], sheet, ()) == ()


@pytest.mark.parametrize(
    ("cells", "overrides", "message"),
    [
        (
            ("Nope", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE"),
            (),
            "names no pool ash",
        ),
        (("A", "FALSE", "maybe", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE"), (), "cell is"),
        (None, (AshOverride("Nope", "weapon", "dagger"),), "names no ash: Nope"),
    ],
)
def test_bad_data_stops_the_build(
    cells: tuple[str, ...] | None, overrides: tuple[AshOverride, ...], message: str
) -> None:
    sheet = _sheet(cells) if cells else _sheet()
    with pytest.raises(BuildError, match=message):
        build_ash_compatibility([_ash("A")], sheet, overrides)


def test_only_an_infusable_weapon_in_a_class_with_no_ash_is_reported() -> None:
    def weapon(name: str, subcategory: str, infusable: bool) -> Item:
        return new_item(name, "weapon", subcategory=subcategory, infusable=infusable)

    table = [
        weapon("A", "katana", True),
        weapon("B", "dagger", True),
        weapon("C", "katana", False),
        new_item("D", "shield", subcategory="small_shield", infusable=True),
        new_item("E", "shield", subcategory="greatshield", infusable=True),
        new_item("F", "talisman"),
    ]
    rows = [
        AshCompatibility("x", "weapon", "dagger"),
        AshCompatibility("x", "shield", None),
    ]
    assert [item.name for item in infusable_without_ashes(table, rows)] == ["A"]


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("A,weapon,dagger,,owner", "empty reason"),
        ("A,armor,head,why,owner", "category is"),
        ("A,weapon,small_shield,why,owner", "is not a weapon class"),
        ("A,weapon,dagger,why,owner\nA,weapon,dagger,why,owner", "duplicate row"),
    ],
)
def test_bad_override_row_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "ash_compatibility.csv"
    path.write_text(f"ash,category,subcategory,reason,reviewer\n{line}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_ash_overrides(path)


def test_blank_subcategory_is_the_whole_category(tmp_path: Path) -> None:
    path = tmp_path / "ash_compatibility.csv"
    path.write_text(
        "ash,category,subcategory,reason,reviewer\nA,shield,,why,owner\n", encoding="utf-8"
    )
    assert load_ash_overrides(path) == (AshOverride("A", "shield", None),)
