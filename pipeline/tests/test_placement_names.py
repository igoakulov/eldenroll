"""Tests for the name variants and for resolving placement names (`data.md` §8.4)."""

from __future__ import annotations

import csv
import re
from collections.abc import Iterator
from pathlib import Path

import pytest

from eldenrando.build.armor import build_armor
from eldenrando.build.ashes import build_ashes
from eldenrando.build.consumables import build_consumables
from eldenrando.build.items import build_item_table, new_item, none_item
from eldenrando.build.spells import build_incantations, build_sorceries
from eldenrando.build.talismans import build_talismans
from eldenrando.build.tools import build_tools
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.ash_sources import load_ash_sources
from eldenrando.loaders.consumables import load_consumable_categories
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.itemslots import load_slots
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.weapons import load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.name_variant import NameVariant
from eldenrando.normalize.placement_names import PlacementNames, placement_names

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
RAW = ROOT / "raw"
ITEMINFO = RAW / "pc_mod_data" / "iteminfo.txt"
SLOTS = RAW / "pc_mod_data" / "itemslots_stable.txt"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")

_DROP_CELL = re.compile(r"^(.*) - \{\d+\} \(.*?\) \[.*?\]$")
_EMPTY_CATALOG = ItemCatalog(
    names={"goods": {}}, counts={}, unique_counts={}, groups={}, locations=()
)
_NOT_A_PLACE = frozenset({"Unused", "Spirit Summon"})
# The rows of `data.md` §8.4 that name a source record. Title case, `Omen Bairn 1/2` and `+N` are
# handled by code.
SECTION_8_4: tuple[tuple[str, str], ...] = (
    ("Nox Monk Bracelets", "Nox Bracelets"),
    ("Nox Monk Greaves", "Nox Greaves"),
    ("Chain Gauntlets", "Gauntlets"),
    ("Champion Gauntlets", "Champion Bracers"),
    ("Blackflame Monk Greave", "Blackflame Monk Greaves"),
    ("Godksin Noble Robe", "Godskin Noble Robe"),
    ("Old Sorcerer Legwraps", "Old Sorcerer's Legwraps"),
    ("Prince Of Death's Star", "Prince of Death's Staff"),
    ("Sword Of St Trina", "Sword of St. Trina"),
    ("Oracle Bubble", "Oracle Bubbles"),
    ("Beast Claw", "Beast Claw (Incantation)"),
    ("Burn O Flame!", "Burn, O Flame!"),
    ("Ekzyke's Decay", "Ekzykes's Decay"),
    ("Ezykes's Decay", "Ekzykes's Decay"),
    ("Aspect Of The Crucible: Breath", "Aspects of the Crucible: Breath"),
    ("Gurrang's Beast Claw", "Gurranq's Beast Claw"),
    ("Sacred Butchering Knife", "Butchering Knife"),
    ("War Surgeon Gown (Altered)", "War Surgeon Gown"),
    ("Beast Champion Armor (Altered)", "Beast Champion Armor"),
    ("Errant Sorcerer Robe (Altered)", "Errant Sorcerer Robe"),
    ("Redmane Knight Helm", "Redmane Knight Gauntlets"),
)


@pytest.fixture(scope="module")
def catalog() -> ItemCatalog:
    return load_item_catalog(ITEMINFO)


@pytest.fixture(scope="module")
def variants() -> dict[str, NameVariant]:
    return load_name_variants(OVERRIDES / "name_variants.csv")


@pytest.fixture(scope="module")
def table(catalog: ItemCatalog, variants: dict[str, NameVariant]) -> tuple[Item, ...]:
    sheet = load_consumable_categories(RAW / "csv" / "tools_consumables_categories.csv")
    return build_item_table(
        (
            *build_weapons(
                catalog,
                variants,
                load_added_items(OVERRIDES / "items.csv"),
                load_weapon_categories(RAW / "csv" / "weapons_shields_categories.csv"),
            ),
            *build_armor(catalog, variants),
            *build_talismans(catalog),
            *build_ashes(catalog, variants, load_ash_sources(OVERRIDES / "ash_sources.csv")),
            *build_sorceries(catalog, variants),
            *build_incantations(catalog, variants),
            *build_tools(catalog, sheet),
            *build_consumables(sheet),
            none_item(),
        )
    )


@pytest.fixture(scope="module")
def names(
    table: tuple[Item, ...], catalog: ItemCatalog, variants: dict[str, NameVariant]
) -> PlacementNames:
    return placement_names(table, catalog, variants)


def _slot_lines() -> Iterator[tuple[str, str]]:
    """Yield `(area, line)` for every line of a randomizable slot."""
    for slot in load_slots(SLOTS):
        if slot.is_randomizable:
            for line in slot.debug_lines:
                yield slot.area, line


def _rows(file_name: str) -> list[list[str]]:
    with (RAW / "csv" / file_name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def _drop_names() -> set[str]:
    """Return every item name of both drop CSVs, leaving out rows that are not places."""
    out: set[str] = set()
    header, *rows = _rows("item_drop_locations.csv")
    columns = [index for index, title in enumerate(header) if title.startswith("Drop ")]
    for row in rows:
        for column in columns:
            matched = _DROP_CELL.match(row[column])
            if matched:
                out.add(matched[1].strip())
    header, *rows = _rows("item_drops.csv")
    place = header.index("Location #1")
    columns = [index for index, title in enumerate(header) if re.match(r"Items? Drop \d+", title)]
    for row in rows:
        if row[place] not in _NOT_A_PLACE:
            out.update(row[column].strip() for column in columns if row[column] not in ("", "None"))
    return out


def _small_names(*variants: NameVariant) -> PlacementNames:
    rows = (
        new_item("Sword", "weapon", subcategory="straight_sword"),
        new_item("Gown", "armor"),
        new_item("Charm", "talisman"),
        new_item("Pebble", "sorcery"),
        new_item("Pebble", "ash"),
        new_item("Barrier", "ash"),
        none_item(),
    )
    return placement_names(rows, _EMPTY_CATALOG, {row.source_id: row for row in variants})


@needs_files
@pytest.mark.parametrize(("source_name", "canonical_name"), SECTION_8_4)
def test_section_8_4_row_is_in_the_table(
    variants: dict[str, NameVariant], source_name: str, canonical_name: str
) -> None:
    rows = [row for row in variants.values() if row.source_name == source_name]
    assert [row.canonical_name for row in rows] == [canonical_name]


@needs_files
def test_the_table_holds_nothing_beyond_section_8_4(variants: dict[str, NameVariant]) -> None:
    assert {(row.source_name, row.canonical_name) for row in variants.values()} == set(SECTION_8_4)


@needs_files
def test_only_names_with_no_other_meaning_apply_by_name(variants: dict[str, NameVariant]) -> None:
    assert {row.source_name for row in variants.values() if row.by_name} == {
        "Sacred Butchering Knife",
        "Nox Monk Bracelets",
        "Nox Monk Greaves",
    }


@needs_files
@pytest.mark.parametrize(
    ("source_name", "name", "category"),
    [
        ("Sacred Butchering Knife", "Butchering Knife", "weapon"),
        ("Nox Monk Bracelets", "Nox Bracelets", "armor"),
        ("Nox Monk Greaves", "Nox Greaves", "armor"),
        ("War Surgeon Gown (Altered)", "War Surgeon Gown", "armor"),
        ("Beast Champion Armor (Altered)", "Beast Champion Armor", "armor"),
        ("Errant Sorcerer Robe (Altered)", "Errant Sorcerer Robe", "armor"),
        ("Festive Garb (Altered)", "Festive Garb", "armor"),
        ("Banished Knight Helm (Altered)", "Banished Knight Helm", "armor"),
        ("Rogier's Rapier +8", "Rogier's Rapier", "weapon"),
        ("Banished Knight's Halberd +8", "Banished Knight's Halberd", "weapon"),
        ("Spear +7", "Spear", "weapon"),
        ("Sword of Light +10", "Sword of Light", "weapon"),
        ("Sword of Darkness +1", "Sword of Darkness", "weapon"),
        ("[Sorcery] Gravity Well", "Gravity Well", "sorcery"),
        ("[Sorcery] Briars of Sin", "Briars of Sin", "sorcery"),
        ("Kukri x5", "Kukri", "consumable"),
        ("Ash of War: Spinning Weapon", "Spinning Weapon", "ash"),
        ("Ash of War: Glintstone Pebble", "Glintstone Pebble", "ash"),
        ("Glintstone Pebble", "Glintstone Pebble", "sorcery"),
        ("Glintblade Phalanx", "Glintblade Phalanx", "sorcery"),
        ("Carian Greatsword", "Carian Greatsword", "sorcery"),
        ("Beast Claw", "Beast Claw", "weapon"),
        ("Redmane Knight Helm", "Redmane Knight Helm", "armor"),
        ("Gauntlets", "Gauntlets", "armor"),
    ],
)
def test_source_name_resolves(
    names: PlacementNames, source_name: str, name: str, category: str
) -> None:
    item = names.resolve(source_name)
    assert item is not None
    assert (item.name, item.category) == (name, category)


@needs_files
@pytest.mark.parametrize(
    "source_name",
    [
        "Thops's Barrier",
        "Carian Retaliation",
        "Golden Vow",
        "Arsenal Charm +1",
        "Ash of War: Kick",
        "Chain Gauntlets",
        "Lightning Bolt",
        "Unused",
    ],
)
def test_name_outside_the_pool_resolves_to_nothing(names: PlacementNames, source_name: str) -> None:
    assert names.resolve(source_name) is None


@needs_files
@pytest.mark.parametrize(
    ("needle", "area", "item_id"),
    [
        ("Beast Claw (Goods 6820)", "dragonbarrow", "beast_claw_incantation"),
        ("Beast Claw (Weapon 68500000)", "gravesite", "beast_claw"),
    ],
)
def test_slot_line_id_tells_the_two_beast_claws_apart(
    names: PlacementNames, needle: str, area: str, item_id: str
) -> None:
    lines = [line for where, line in _slot_lines() if where == area and needle in line]
    assert len(lines) == 1
    item = names.resolve_slot_line(lines[0])
    assert item is not None
    assert item.id == item_id


@needs_files
def test_golden_vow_slot_lines_never_reach_the_ash(names: PlacementNames) -> None:
    lines = [line for _, line in _slot_lines() if line.startswith("Golden Vow - ")]
    assert len(lines) == 4
    assert [names.resolve_slot_line(line) for line in lines] == [None] * 4


@needs_files
def test_prose_line_resolves_to_nothing(names: PlacementNames) -> None:
    assert names.resolve_slot_line("By Sellia (m60) - 1 away, 3 o'clock, 2 height offset") is None


@needs_files
def test_every_rollable_item_but_the_weapon_only_ashes_is_named(
    table: tuple[Item, ...], names: PlacementNames
) -> None:
    found = {item.id for _, line in _slot_lines() if (item := names.resolve_slot_line(line))}
    found |= {item.id for name in _drop_names() if (item := names.resolve(name))}
    unnamed = {
        row.name
        for row in table
        if row.id not in found and row.category not in ("consumable", "none")
    }
    assert unnamed == set(load_ash_sources(OVERRIDES / "ash_sources.csv"))


@needs_files
def test_nox_pieces_come_only_from_the_drop_sheet(names: PlacementNames) -> None:
    slot_ids = {item.id for _, line in _slot_lines() if (item := names.resolve_slot_line(line))}
    assert not {"nox_bracelets", "nox_greaves"} & slot_ids
    drop_ids = {item.id for name in _drop_names() if (item := names.resolve(name))}
    assert {"nox_bracelets", "nox_greaves"} <= drop_ids


@needs_files
def test_new_unmatched_placement_name_fails(catalog: ItemCatalog, names: PlacementNames) -> None:
    known = {name for entries in catalog.names.values() for name in entries.values()}
    slot_names = {name for slot in load_slots(SLOTS) if slot.is_randomizable for name in slot.items}
    unknown = {
        name
        for name in slot_names | _drop_names()
        if names.resolve(name) is None
        and name not in known
        and re.sub(r" x\d+$", "", name) not in known
        and re.sub(r" \+\d+$", "", name) not in known
        and "Bell Bearing" not in name
    }
    assert unknown == {
        "Flask of Cerulean Tears",
        "Flask of Crimson Tears",
        "Golden Vow",
        "Letter from Volcano Manor",
        "Radiant Baldachin's Blessing",
        "Tarnished's Wizened Finger",
        "Unalloyed Gold Needle",
    }


def test_altered_suffix_only_merges_into_armor() -> None:
    names = _small_names()
    gown = names.resolve("Gown (Altered)")
    assert gown is not None
    assert gown.name == "Gown"
    assert names.resolve("Sword (Altered)") is None


def test_upgrade_suffix_only_strips_to_a_weapon() -> None:
    names = _small_names()
    sword = names.resolve("Sword +3")
    assert sword is not None
    assert sword.name == "Sword"
    assert names.resolve("Charm +1") is None


def test_bare_name_is_never_an_ash() -> None:
    names = _small_names()
    pebble = names.resolve("Pebble")
    assert pebble is not None
    assert pebble.category == "sorcery"
    assert names.resolve("Barrier") is None
    barrier = names.resolve("Ash of War: Barrier")
    assert barrier is not None
    assert barrier.category == "ash"


def test_id_only_variant_does_not_apply_by_name() -> None:
    names = _small_names(NameVariant(source_id="1", source_name="Blade", canonical_name="Sword"))
    assert names.resolve("Blade") is None


def test_by_name_variant_applies() -> None:
    names = _small_names(
        NameVariant(source_id="1", source_name="Blade", canonical_name="Sword", by_name=True)
    )
    sword = names.resolve("Blade")
    assert sword is not None
    assert sword.name == "Sword"


def test_by_name_variant_over_a_real_item_stops_the_build() -> None:
    variant = NameVariant(source_id="1", source_name="Gown", canonical_name="Sword", by_name=True)
    with pytest.raises(BuildError, match="also a real item's name"):
        _small_names(variant)


def test_by_name_variant_to_an_unknown_item_stops_the_build() -> None:
    variant = NameVariant(source_id="1", source_name="Blade", canonical_name="Saber", by_name=True)
    with pytest.raises(BuildError, match="names no item"):
        _small_names(variant)


def test_two_non_ash_rows_with_one_name_stop_the_build() -> None:
    rows = (new_item("Pebble", "sorcery"), new_item("Pebble", "incantation"))
    with pytest.raises(BuildError, match="share the name 'Pebble'"):
        placement_names(rows, _EMPTY_CATALOG, {})


def test_slot_line_with_an_unknown_id_falls_back_to_its_name() -> None:
    names = _small_names()
    item = names.resolve_slot_line("Sword - lot 1[asset] Sword (Goods 99)")
    assert item is not None
    assert item.name == "Sword"
