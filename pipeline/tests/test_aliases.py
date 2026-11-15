"""Tests for the aliases against the real item table
(`web/src/engine/README.md#Empty slots and aliases`)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.aliases import assign_aliases
from eldenroll.build.items import new_item
from eldenroll.build.modifiers import build_modifiers
from eldenroll.errors import BuildError
from eldenroll.loaders.aliases import AliasRow, load_aliases
from eldenroll.loaders.modifiers import load_modifiers
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.item import Item
from eldenroll.model.modifier import RolledCondition
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"


@pytest.fixture(scope="module")
def table(sources: GapSources) -> tuple[Item, ...]:
    return sources.table


def test_every_consumable_has_an_alias_and_none_has_none(table: tuple[Item, ...]) -> None:
    assert all(row.alias for row in table if row.category == "consumable")
    assert next(row for row in table if row.category == "none").alias is None


def test_parry_only_reads_the_same_ashes_as_the_alias(table: tuple[Item, ...]) -> None:
    rows = build_modifiers(load_modifiers(OVERRIDES / "modifiers.csv"))
    row = next(one for one in rows if one.id == "parry_only_needs_a_parry_ash")
    aliased = {item.id for item in table if item.alias == "any_parry_ash"}
    for condition in row.when:
        assert isinstance(condition, RolledCondition)
        assert set(condition.selector.ids or ()) == aliased


def _row(alias: str, kind: str, *ids: str) -> AliasRow:
    return AliasRow(alias, alias, ((kind, ids),))


def _talisman(name: str) -> Item:
    return replace(new_item(name, "talisman"), id=name)


def test_an_item_in_two_aliases_fails() -> None:
    rows = [_row("a", "item", "x"), _row("b", "item", "x")]
    with pytest.raises(BuildError, match="item in several aliases: x"):
        assign_aliases([_talisman("x")], rows)


def test_an_unknown_member_fails() -> None:
    with pytest.raises(BuildError, match="selector matches nothing: item: typo"):
        assign_aliases([_talisman("x")], [_row("a", "item", "x", "typo")])


def test_other_items_keep_a_null_alias() -> None:
    rows = assign_aliases([_talisman("x"), _talisman("y")], [_row("a", "item", "x")])
    assert [row.alias for row in rows] == ["a", None]


@pytest.mark.parametrize(
    ("row", "message"),
    [
        ("any_staff_seal,Any staff,subcategory:catalyst", "is not the slug"),
        (",,subcategory:catalyst", "is not the slug"),
        ("any_x,Any X,", "empty members"),
        ("any_x,Any X,catalyst", "has no kind"),
        ("any_x,Any X,item:a\nany_x,Any X,item:b", "duplicate alias id"),
    ],
)
def test_bad_rows_fail_to_load(tmp_path: Path, row: str, message: str) -> None:
    path = tmp_path / "aliases.csv"
    path.write_text(f"id,label,members\n{row}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_aliases(path)
