"""Tests for the stat requirements against the real sources
(`data/sources/README.md#The base-game JSON files`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.items import new_item
from eldenroll.loaders.requirements import load_requirements
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.item import Item
from eldenroll.model.name_variant import NameVariant
from eldenroll.normalize.requirements import assign_requirements, readable_stats
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
BEARS_STATS = ("weapon", "shield", "sorcery", "incantation")


@pytest.fixture(scope="module")
def table(sources: GapSources) -> tuple[Item, ...]:
    return sources.table


def _stats(row: Item) -> tuple[int, int, int, int, int]:
    return (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc)


def _record(name: str, *attributes: tuple[str, object], record_id: str = "a") -> dict[str, object]:
    return {
        "id": record_id,
        "name": name,
        "requiredAttributes": [{"name": stat, "amount": amount} for stat, amount in attributes],
    }


def _assign(
    row: Item,
    record: dict[str, object],
    overrides: dict[str, dict[str, int]] | None = None,
    variants: dict[str, NameVariant] | None = None,
) -> Item:
    records = {"weapons": [record], "shields": [], "sorceries": [], "incantations": []}
    return assign_requirements([row], records, variants or {}, overrides or {})[0]


def test_requirements_are_five_integers_on_every_row(table: tuple[Item, ...]) -> None:
    for row in table:
        assert all(isinstance(stat, int) and stat >= 0 for stat in _stats(row)), row.name


def test_only_items_that_bear_stats_have_any(table: tuple[Item, ...]) -> None:
    assert not [row.name for row in table if row.category not in BEARS_STATS and any(_stats(row))]


def test_only_serpent_hunter_has_no_requirements(table: tuple[Item, ...]) -> None:
    zeros = {row.name for row in table if row.category in BEARS_STATS and not any(_stats(row))}
    assert zeros == {"Serpent-Hunter"}


@pytest.mark.parametrize(
    ("name", "stats"),
    [
        ("Oracle Bubbles", (0, 0, 19, 0, 15)),
        ("Hand of Malenia", (16, 48, 0, 0, 0)),
        ("Moonveil", (12, 18, 23, 0, 0)),
        ("Grave Scythe", (17, 13, 0, 0, 0)),
        ("Ripple Crescent Halberd", (12, 12, 0, 0, 20)),
        ("Cleanrot Knight's Sword", (11, 13, 0, 0, 0)),
        ("Lordsworn's Shield", (16, 0, 0, 0, 0)),
        ("Varré's Bouquet", (8, 16, 0, 0, 24)),
        ("Brass Shield", (16, 0, 0, 0, 0)),
        ("Burn, O Flame!", (0, 0, 0, 27, 0)),
        ("Siluria's Tree", (27, 13, 0, 20, 0)),
        ("Beast Claw", (13, 11, 0, 0, 0)),
        ("Land of Shadow", (0, 0, 0, 58, 0)),
        ("Impenetrable Thorns", (0, 0, 0, 24, 0)),
        ("Rabbath's Cannon", (28, 16, 0, 0, 0)),
        ("Sword of Night and Flame", (12, 12, 24, 24, 0)),
        ("Clayman's Harpoon", (12, 10, 12, 0, 0)),
    ],
)
def test_item_has_its_requirements(
    table: tuple[Item, ...], name: str, stats: tuple[int, int, int, int, int]
) -> None:
    assert _stats(next(row for row in table if row.name == name)) == stats


@pytest.mark.parametrize(
    ("field", "expected"),
    [
        ([{"name": "Str", "amount": 10}, {"name": "Dex", "amount": 0}], {"str": 10}),
        (
            [{"name": "STRENGTH", "amount": 10}, {"name": "Faith", "amount": 5}],
            {"str": 10, "fth": 5},
        ),
        ([{"name": "", "amount": 20}, {"name": "Arc", "amount": 7}], {"arc": 7}),
        ([{"name": "32", "amount": None}], {}),
        ([{"name": "-", "amount": 0}], {}),
        ([], {}),
        (None, {}),
    ],
)
def test_readable_stats(field: object, expected: dict[str, int]) -> None:
    assert readable_stats(field) == expected


def test_record_name_is_matched_ignoring_case() -> None:
    row = _assign(new_item("Hand of Malenia", "weapon"), _record("Hand Of Malenia", ("Dex", 48)))
    assert row.req_dex == 48


def test_variant_renames_the_record() -> None:
    variants = {"a": NameVariant("a", "Old", "New")}
    row = _assign(new_item("New", "weapon"), _record("Old", ("Str", 9)), variants=variants)
    assert row.req_str == 9


def test_first_record_of_an_item_counts() -> None:
    records = {
        "weapons": [_record("A", ("Str", 9)), _record("A", ("Str", 5), record_id="b")],
        "shields": [],
        "sorceries": [],
        "incantations": [],
    }
    assert assign_requirements([new_item("A", "weapon")], records, {}, {})[0].req_str == 9


def test_override_replaces_the_record_whole() -> None:
    override = {"A": {"str": 0, "dex": 0, "int": 19, "fth": 0, "arc": 15}}
    row = _assign(new_item("A", "weapon"), _record("A", ("Str", 9)), overrides=override)
    assert _stats(row) == (0, 0, 19, 0, 15)


def test_item_with_no_record_stays_at_zero() -> None:
    assert _stats(_assign(new_item("B", "weapon"), _record("A", ("Str", 9)))) == (0, 0, 0, 0, 0)


def test_other_categories_are_not_matched() -> None:
    assert _stats(_assign(new_item("A", "talisman"), _record("A", ("Str", 9)))) == (0, 0, 0, 0, 0)


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("A,1,2,3,4,x,why", "arc is"),
        ("A,1,2,3,4,-5,why", "arc is"),
        ("A,1,2,3,4,,why", "empty arc"),
        ("A,1,2,3,4,5,", "empty reason"),
        ("A,1,2,3,4,5,why\nA,1,2,3,4,5,why", "duplicate item"),
    ],
)
def test_bad_override_row_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "requirements.csv"
    path.write_text(f"item,str,dex,int,fth,arc,reason\n{line}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_requirements(path)
