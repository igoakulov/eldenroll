"""Tests for the name variants and for resolving placement names
(`data/sources/README.md#Matching names`)."""

from __future__ import annotations

import csv
import re
from collections.abc import Iterator
from pathlib import Path

import pytest

from eldenroll.build.armor import build_armor
from eldenroll.build.ashes import build_ashes
from eldenroll.build.consumables import build_consumables
from eldenroll.build.items import build_item_table, new_item, none_item
from eldenroll.build.spells import build_incantations, build_sorceries
from eldenroll.build.talismans import build_talismans
from eldenroll.build.tools import build_tools
from eldenroll.build.weapons import build_weapons
from eldenroll.errors import BuildError
from eldenroll.loaders.added_items import load_added_items
from eldenroll.loaders.ash_sources import load_ash_sources
from eldenroll.loaders.consumables import load_consumable_categories
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.loaders.weapons import load_weapon_categories
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.model.item_slot import ItemSlot
from eldenroll.model.name_variant import NameVariant
from eldenroll.normalize.placement_names import PlacementNames, placement_names
from eldenroll.paths import (
    ENEMY_DROPS,
    ENEMY_ITEM_LOTS,
    TOOL_CONSUMABLE_CLASSES,
    WEAPON_SHIELD_CLASSES,
)
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

_DROP_CELL = re.compile(r"^(.*) - \{\d+\} \(.*?\) \[.*?\]$")
_EMPTY_CATALOG = ItemCatalog(
    names={"goods": {}}, counts={}, unique_counts={}, groups={}, locations=()
)
_NOT_A_PLACE = frozenset({"Unused", "Spirit Summon"})


@pytest.fixture(scope="module")
def catalog(sources: GapSources) -> ItemCatalog:
    return sources.catalog


@pytest.fixture(scope="module")
def variants() -> dict[str, NameVariant]:
    return load_name_variants(OVERRIDES / "name_variants.csv")


@pytest.fixture(scope="module")
def table(catalog: ItemCatalog, variants: dict[str, NameVariant]) -> tuple[Item, ...]:
    sheet = load_consumable_categories(TOOL_CONSUMABLE_CLASSES)
    return build_item_table(
        (
            *build_weapons(
                catalog,
                variants,
                load_added_items(OVERRIDES / "items.csv"),
                load_weapon_categories(WEAPON_SHIELD_CLASSES),
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


def _slot_lines(slots: tuple[ItemSlot, ...]) -> Iterator[tuple[str, str]]:
    """Yield `(area, line)` for every line of a randomizable slot."""
    for slot in slots:
        if slot.is_randomizable:
            for line in slot.debug_lines:
                yield slot.area, line


def _rows(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def _drop_names() -> set[str]:
    """Return every item name of both drop CSVs, leaving out rows that are not places."""
    out: set[str] = set()
    header, *rows = _rows(ENEMY_DROPS)
    columns = [index for index, title in enumerate(header) if title.startswith("Drop ")]
    for row in rows:
        for column in columns:
            matched = _DROP_CELL.match(row[column])
            if matched:
                out.add(matched[1].strip())
    header, *rows = _rows(ENEMY_ITEM_LOTS)
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


@pytest.mark.parametrize(
    ("source_name", "name", "category"),
    [
        ("Sacred Butchering Knife", "Butchering Knife", "weapon"),
        ("War Surgeon Gown (Altered)", "War Surgeon Gown", "armor"),
        ("Rogier's Rapier +8", "Rogier's Rapier", "weapon"),
        ("[Sorcery] Gravity Well", "Gravity Well", "sorcery"),
        ("Kukri x5", "Kukri", "consumable"),
        ("Ash of War: Glintstone Pebble", "Glintstone Pebble", "ash"),
        ("Glintstone Pebble", "Glintstone Pebble", "sorcery"),
        ("Beast Claw", "Beast Claw", "weapon"),
        ("Gauntlets", "Gauntlets", "armor"),
    ],
)
def test_source_name_resolves(
    names: PlacementNames, source_name: str, name: str, category: str
) -> None:
    item = names.resolve(source_name)
    assert item is not None
    assert (item.name, item.category) == (name, category)


@pytest.mark.parametrize(
    "source_name",
    [
        "Thops's Barrier",
        "Golden Vow",
        "Arsenal Charm +1",
        "Chain Gauntlets",
    ],
)
def test_name_outside_the_pool_resolves_to_nothing(names: PlacementNames, source_name: str) -> None:
    assert names.resolve(source_name) is None


@pytest.mark.parametrize(
    ("needle", "area", "item_id"),
    [
        ("Beast Claw (Goods 6820)", "dragonbarrow", "beast_claw_incantation"),
        ("Beast Claw (Weapon 68500000)", "gravesite", "beast_claw"),
    ],
)
def test_slot_line_id_tells_the_two_beast_claws_apart(
    sources: GapSources, names: PlacementNames, needle: str, area: str, item_id: str
) -> None:
    lines = [line for where, line in _slot_lines(sources.slots) if where == area and needle in line]
    assert len(lines) == 1
    item = names.resolve_slot_line(lines[0])
    assert item is not None
    assert item.id == item_id


def test_golden_vow_slot_lines_never_reach_the_ash(
    sources: GapSources, names: PlacementNames
) -> None:
    lines = [line for _, line in _slot_lines(sources.slots) if line.startswith("Golden Vow - ")]
    assert lines
    assert not any(names.resolve_slot_line(line) for line in lines)


def test_prose_line_resolves_to_nothing(names: PlacementNames) -> None:
    assert names.resolve_slot_line("By Sellia (m60) - 1 away, 3 o'clock, 2 height offset") is None


def test_every_rollable_item_but_the_weapon_only_ashes_is_named(
    sources: GapSources, table: tuple[Item, ...], names: PlacementNames
) -> None:
    found = {
        item.id for _, line in _slot_lines(sources.slots) if (item := names.resolve_slot_line(line))
    }
    found |= {item.id for name in _drop_names() if (item := names.resolve(name))}
    unnamed = {
        row.name
        for row in table
        if row.id not in found and row.category not in ("consumable", "none")
    }
    assert unnamed == set(load_ash_sources(OVERRIDES / "ash_sources.csv"))


def test_nox_pieces_come_only_from_the_drop_sheet(
    sources: GapSources, names: PlacementNames
) -> None:
    slot_ids = {
        item.id for _, line in _slot_lines(sources.slots) if (item := names.resolve_slot_line(line))
    }
    assert not {"nox_bracelets", "nox_greaves"} & slot_ids
    drop_ids = {item.id for name in _drop_names() if (item := names.resolve(name))}
    assert {"nox_bracelets", "nox_greaves"} <= drop_ids


def test_new_unmatched_placement_name_fails(
    sources: GapSources, catalog: ItemCatalog, names: PlacementNames
) -> None:
    known = {name for entries in catalog.names.values() for name in entries.values()}
    slots = sources.slots
    slot_names = {name for slot in slots if slot.is_randomizable for name in slot.items}
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
