"""Tests for the aliases against the real item table
(`web/src/engine/README.md#Empty slots and aliases`)."""

from __future__ import annotations

from collections import Counter
from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.aliases import assign_aliases, build_aliases
from eldenroll.build.items import new_item
from eldenroll.build.modifiers import build_modifiers
from eldenroll.errors import BuildError
from eldenroll.loaders.aliases import AliasRow, load_aliases
from eldenroll.loaders.modifiers import load_modifiers
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.item import Item
from eldenroll.model.modifier import RolledCondition
from eldenroll.validate.gaps import load_sources

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
CSV = OVERRIDES / "aliases.csv"


@pytest.fixture(scope="module")
def table() -> tuple[Item, ...]:
    return load_sources(ROOT).table


def _members(table: tuple[Item, ...], alias: str) -> set[str]:
    return {row.name for row in table if row.alias == alias}


def test_the_labels_match_the_prd() -> None:
    assert [alias.label for alias in build_aliases(load_aliases(CSV))] == [
        "Any staff",
        "Any seal",
        "Any torch",
        "Any perfume bottle",
        "Any parry ash",
        "Any Crucible talisman",
        "Any Scorpion Charm",
        "Any Scarseal / Soreseal",
        "Any pots / perfumes",
        "Other throwables (not pots / perfumes)",
        "None",
    ]


def test_member_counts(table: tuple[Item, ...]) -> None:
    assert Counter(row.alias for row in table if row.alias) == {
        "any_staff": 20,
        "any_seal": 12,
        "any_torch": 8,
        "any_perfume_bottle": 5,
        "any_parry_ash": 5,
        "any_crucible_talisman": 5,
        "any_scorpion_charm": 4,
        "any_scarseal_soreseal": 4,
        "none": 4,
        "any_pots_perfumes": 50 + 6,
        "other_throwables_not_pots_perfumes": 25,
    }


def test_named_members(table: tuple[Item, ...]) -> None:
    assert _members(table, "any_parry_ash") == {
        "Parry",
        "Carian Retaliation",
        "Golden Parry",
        "Storm Wall",
        "Thops's Barrier",
    }
    assert _members(table, "any_scarseal_soreseal") == {
        "Radagon's Soreseal",
        "Marika's Soreseal",
        "Radagon's Scarseal",
        "Marika's Scarseal",
    }
    assert _members(table, "any_scorpion_charm") == {
        "Magic Scorpion Charm",
        "Lightning Scorpion Charm",
        "Fire Scorpion Charm",
        "Sacred Scorpion Charm",
    }
    assert "Talisman of All Crucibles" in _members(table, "any_crucible_talisman")


def test_members_stay_in_their_category(table: tuple[Item, ...]) -> None:
    categories = {
        "any_staff": {"weapon"},
        "any_seal": {"weapon"},
        "any_torch": {"weapon"},
        "any_perfume_bottle": {"weapon"},
        "any_parry_ash": {"ash"},
        "any_crucible_talisman": {"talisman"},
        "any_scorpion_charm": {"talisman"},
        "any_scarseal_soreseal": {"talisman"},
        "any_pots_perfumes": {"consumable"},
        "other_throwables_not_pots_perfumes": {"consumable"},
    }
    for alias, wanted in categories.items():
        assert {row.category for row in table if row.alias == alias} == wanted


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
