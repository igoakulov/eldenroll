"""Tests for `infusable` against the real sources (`data/README.md#Weapons and shields`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.items import new_item
from eldenroll.errors import BuildError
from eldenroll.loaders.infusable import load_infusable
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.item import Item
from eldenroll.normalize.infusable import assign_infusable
from eldenroll.validate.gaps import load_sources

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def table() -> tuple[Item, ...]:
    return load_sources(ROOT).table


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Longsword", True),
        ("Brass Shield", True),
        ("Bandit's Curved Sword", True),
        ("Bloodhound's Fang", False),
        ("Dragon Halberd", False),
        ("Erdtree Greatshield", False),
        ("Great Katana", True),
        ("Beast Claw", True),
        ("Milady", True),
        ("Red Bear's Claw", False),
        ("Carian Sorcery Sword", False),
        ("Claws of Night", False),
        ("Pata", True),
        ("Reed Great Katana", True),
        ("Firespark Perfume Bottle", True),
        ("Lamenting Visage", False),
        ("Golem Fist", True),
        ("Golem Greatbow", False),
        ("Crystal Knife", False),
        ("Erdtree Bow", False),
        ("Varré's Bouquet", False),
        ("Sentry's Torch", False),
        ("Great Épée", True),
        ("Miséricorde", True),
        ("Treespear", False),
        ("Inseparable Sword", False),
        ("Deadly Poison Perfume Bottle", False),
        ("Spread Crossbow", False),
        ("Soldier's Crossbow", False),
        ("Hand Ballista", False),
    ],
)
def test_weapon_has_its_flag(table: tuple[Item, ...], name: str, expected: bool) -> None:
    assert next(row for row in table if row.name == name).infusable is expected


def test_of_the_smithscript_weapons_only_the_shield_cannot_hold_an_ash(
    table: tuple[Item, ...],
) -> None:
    smithscript = [row for row in table if row.name.startswith("Smithscript")]
    assert len(smithscript) == 6
    assert [row.name for row in smithscript if not row.infusable] == ["Smithscript Shield"]


def test_catalysts_follow_the_owners_decision(table: tuple[Item, ...]) -> None:
    staves = {row.name for row in table if row.subcategory == "glintstone_staff" and row.infusable}
    seals = [row for row in table if row.subcategory == "sacred_seal"]
    assert len(staves) == 19
    assert "Carian Regal Scepter" not in staves
    assert len(seals) == 12
    assert not any(row.infusable for row in seals)


@pytest.mark.parametrize("subcategory", ["crossbow", "ballista"])
def test_class_that_never_holds_an_ash(table: tuple[Item, ...], subcategory: str) -> None:
    rows = [row for row in table if row.subcategory == subcategory]
    assert rows
    assert not any(row.infusable for row in rows)


def test_other_categories_stay_null(table: tuple[Item, ...]) -> None:
    others = [row for row in table if row.category not in ("weapon", "shield")]
    assert others
    assert all(row.infusable is None for row in others)


def test_override_beats_the_class_and_the_sheet() -> None:
    rows = assign_infusable(
        [
            new_item("A", "weapon", subcategory="katana"),
            new_item("B", "weapon", subcategory="katana"),
            new_item("C", "weapon", subcategory="katana"),
            new_item("D", "weapon", subcategory="katana"),
            new_item("E", "weapon", subcategory="crossbow"),
            new_item("F", "shield", subcategory="small_shield"),
            new_item("G", "talisman"),
        ],
        {"B", "C"},
        {"C": True, "D": False},
    )
    assert [row.infusable for row in rows] == [True, False, True, False, False, True, None]


@pytest.mark.parametrize(
    ("unique_skill", "overrides"),
    [({"Nope"}, {}), (set[str](), {"Nope": True}), (set[str](), {"Talisman": True})],
)
def test_name_that_is_no_weapon_stops_the_build(
    unique_skill: set[str], overrides: dict[str, bool]
) -> None:
    with pytest.raises(BuildError, match="name no weapon"):
        assign_infusable([new_item("Talisman", "talisman")], unique_skill, overrides)


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("A,maybe,why", "infusable is"),
        ("A,true,", "empty reason"),
        ("A,true,why\nA,false,why", "duplicate item"),
    ],
)
def test_bad_override_row_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "infusable.csv"
    path.write_text(f"item,infusable,reason\n{line}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_infusable(path)
