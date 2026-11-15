"""Tests for subcategories and armor slots against the real sources (`data/README.md#Armor`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.items import new_item
from eldenroll.errors import BuildError
from eldenroll.loaders.armor_slots import load_armor_slots
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.item import Item
from eldenroll.model.name_variant import NameVariant
from eldenroll.normalize.armor_slots import assign_armor_slots
from eldenroll.validate.gaps import GapSources
from eldenroll.validate.subcategories import validate_subcategories

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

# armors.json lists these as chests, though their game ids read as head pieces.
ID_MISLEADS = {"Commoner's Simple Garb", "Lazuli Robe"}
ID_DIGITS = {0: "head", 1: "body", 2: "arms", 3: "legs"}


@pytest.fixture(scope="module")
def slots(sources: GapSources) -> dict[str, str | None]:
    return {row.name: row.subcategory for row in sources.table if row.category == "armor"}


def test_slots_agree_with_the_game_ids_but_for_two_pieces(
    sources: GapSources, slots: dict[str, str | None]
) -> None:
    catalog = sources.catalog
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    by_id = {
        variants[str(item_id)].canonical_name if str(item_id) in variants else name: item_id
        for item_id, name in catalog.names["protector"].items()
    }
    game_ids = {name: by_id.get(name, by_id.get(f"{name} (Altered)")) for name in slots}
    disagree = {
        name
        for name, slot in slots.items()
        if (game_id := game_ids[name]) is not None and slot != ID_DIGITS[(game_id // 100) % 10]
    }
    assert disagree == ID_MISLEADS


@pytest.mark.parametrize(
    ("name", "slot"),
    [
        ("Pelt of Ralva", "head"),
        ("St. Trina's Blossom", "head"),
        ("Greatjar", "head"),
        ("Ascetic's Loincloth", "body"),
        ("Commoner's Simple Garb", "body"),
        ("Lazuli Robe", "body"),
        ("Leda's Armor", "body"),
        ("Gold Tattoo (Arm)", "arms"),
        ("Gauntlets", "arms"),
        ("Redmane Knight Gauntlets", "arms"),
        ("Spellblade's Gloves", "arms"),
        ("Leontiel's Boots", "legs"),
        ("High Priest Undergarments", "legs"),
        ("Dryleaf Cuissardes", "legs"),
        ("Redmane Knight Helm", "head"),
    ],
)
def test_piece_has_its_slot(slots: dict[str, str | None], name: str, slot: str) -> None:
    assert slots[name] == slot


def _piece(name: str) -> Item:
    return new_item(name, "armor")


def _record(name: str, category: str, record_id: str = "a") -> dict[str, object]:
    return {"id": record_id, "name": name, "category": category}


def test_json_slot_is_used_ignoring_case_and_altered_form() -> None:
    rows = assign_armor_slots(
        [_piece("Hand of Malenia Helm")],
        [_record("Hand Of Malenia Helm (Altered)", "Helm")],
        {},
        {},
    )
    assert rows[0].subcategory == "head"


def test_gauntlet_typo_is_arms() -> None:
    rows = assign_armor_slots([_piece("Gloves")], [_record("Gloves", "Gauntlet")], {}, {})
    assert rows[0].subcategory == "arms"


def test_variant_renames_the_record_before_it_is_matched() -> None:
    variants = {"a": NameVariant("a", "Old", "New")}
    rows = assign_armor_slots([_piece("New")], [_record("Old", "Leg Armor")], variants, {})
    assert rows[0].subcategory == "legs"


def test_override_fills_a_piece_the_json_lacks() -> None:
    rows = assign_armor_slots([_piece("Greatjar")], [], {}, {"Greatjar": "head"})
    assert rows[0].subcategory == "head"


@pytest.mark.parametrize(
    ("records", "overrides", "message"),
    [
        ([], {}, "no slot: Pata"),
        ([], {"Nope": "head"}, "name no piece: Nope"),
        ([_record("Pata", "Helm")], {"Pata": "head"}, "already gives the slot of: Pata"),
        ([_record("Pata", "Hat")], {}, "unknown armor category"),
        (
            [_record("Pata", "Helm"), _record("Pata", "Leg Armor", "b")],
            {},
            "both head and legs",
        ),
    ],
)
def test_bad_slot_data_stops_the_build(
    records: list[dict[str, object]], overrides: dict[str, str], message: str
) -> None:
    with pytest.raises(BuildError, match=message):
        assign_armor_slots([_piece("Pata")], records, {}, overrides)


@pytest.mark.parametrize(
    ("row", "fails"),
    [
        (new_item("A", "weapon", subcategory="katana"), False),
        (new_item("A", "weapon", subcategory="small_shield"), True),
        (new_item("A", "shield", subcategory="thrusting_shield"), True),
        (new_item("A", "armor", subcategory="head"), False),
        (new_item("A", "armor"), True),
        (new_item("A", "consumable", subcategory="pots"), False),
        (new_item("A", "talisman"), False),
        (new_item("A", "talisman", subcategory="head"), True),
    ],
)
def test_validate_subcategories(row: Item, fails: bool) -> None:
    if fails:
        with pytest.raises(BuildError, match="bad category or subcategory on: A"):
            validate_subcategories([row])
    else:
        validate_subcategories([row])


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("A,head,", "empty reason"),
        ("A,hat,why", "slot is"),
        ("A,head,why\nA,body,why", "duplicate piece"),
    ],
)
def test_bad_override_row_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "armor_slots.csv"
    path.write_text(f"piece,slot,reason\n{line}\n", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_armor_slots(path)
