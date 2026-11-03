"""Which rows count for a selection of regions and dead bosses (`prd.md` §3.2, §8.3)."""

from __future__ import annotations

from collections.abc import Collection, Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

from eldenrando.build.armor_sets import build_armor_sets
from eldenrando.build.boss_table import load_boss_overrides, load_boss_rows
from eldenrando.build.bosses import build_boss_instances
from eldenrando.build.placement import (
    Placement,
    PlacementSources,
    build_placements,
    merged_labels,
)
from eldenrando.loaders.armor_sets import load_armor_sets
from eldenrando.loaders.boss_links import (
    load_armor_shop_bosses,
    load_remembrance_bosses,
    load_slot_links,
)
from eldenrando.loaders.drops import load_drop_locations, load_item_drops
from eldenrando.loaders.odds import load_odds
from eldenrando.loaders.region_areas import load_region_areas
from eldenrando.loaders.regions import load_regions
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.boss_instance import BossInstance
from eldenrando.model.item import Item
from eldenrando.model.item_location import ItemLocation
from eldenrando.model.region import ASHEN_CAPITAL, ROYAL_CAPITAL, SHUNNING_GROUNDS, Region
from eldenrando.normalize.odds import assign_armor_set_odds
from eldenrando.normalize.placement_names import placement_names
from eldenrando.paths import ENEMY_DROPS, ENEMY_ITEM_LOTS
from eldenrando.validate.gaps import GapSources, load_sources


@dataclass(frozen=True, slots=True)
class PlacementData:
    """The tables placement is checked against, already built."""

    table: tuple[Item, ...]
    placements: tuple[Placement, ...]
    bosses: tuple[BossInstance, ...]
    regions: tuple[Region, ...]
    region_of_location: Mapping[str, str]
    armor_sets: tuple[ArmorSet, ...]


def needs_location(item: Item) -> bool:
    """Return whether an item must have a row: every one but consumables and `none`."""
    return item.category not in ("consumable", "none")


def selected_locations(
    regions: Collection[str], region_of_location: Mapping[str, str]
) -> frozenset[str]:
    """Return the locations a selection reaches.

    The Ashen Capital replaces the Royal one, except for the Shunning-Grounds, which it reaches
    whether or not the Royal Capital is selected.
    """
    selected = {
        location for location, region in region_of_location.items() if region in regions
    }
    if ASHEN_CAPITAL in regions:
        selected = {loc for loc in selected if region_of_location[loc] != ROYAL_CAPITAL}
        selected |= SHUNNING_GROUNDS
    return frozenset(selected)


def row_counts(
    row: ItemLocation,
    locations: Collection[str],
    dead: Collection[str],
    bosses: Mapping[str, BossInstance],
    *,
    boss_items_only_from_dead: bool = True,
) -> bool:
    """Return whether one row makes its item eligible, by the table in `prd.md` §8.3."""
    if row.location_id is not None:
        return row.location_id in locations
    boss = bosses[str(row.boss_instance_id)]
    if boss_items_only_from_dead and boss.odds > 0:
        return boss.id in dead
    return boss.location_id in locations


def eligible_items(
    rows: Iterable[ItemLocation],
    regions: Collection[str],
    dead: Collection[str],
    bosses: Mapping[str, BossInstance],
    region_of_location: Mapping[str, str],
) -> frozenset[str]:
    """Return the ids of the items with at least one row that counts."""
    locations = selected_locations(regions, region_of_location)
    return frozenset(row.item_id for row in rows if row_counts(row, locations, dead, bosses))


def eligible_sets(sets: Iterable[ArmorSet], items: Collection[str]) -> tuple[ArmorSet, ...]:
    """Return the sets whose every piece is reachable; a set short a piece is not filtered."""
    return tuple(row for row in sets if all(piece in items for piece in row.pieces))


def load_placement_data(root: Path, sources: GapSources | None = None) -> PlacementData:
    """Return the placement tables, from `data/sources/` and a checkout's `data/overrides/`."""
    overrides = root / "data" / "overrides"
    loaded = load_sources(root) if sources is None else sources
    boss_overrides = load_boss_overrides(overrides)
    bosses = build_boss_instances(load_boss_rows(), boss_overrides)
    regions = load_regions(overrides / "regions.csv")
    placements = build_placements(
        PlacementSources(
            names=placement_names(loaded.table, loaded.catalog, loaded.variants),
            slots=loaded.slots,
            drops=load_drop_locations(ENEMY_DROPS),
            lots=load_item_drops(ENEMY_ITEM_LOTS),
            bosses=bosses,
            merged_labels=merged_labels(boss_overrides.merges),
            aliases=boss_overrides.aliases,
            remembrances=load_remembrance_bosses(overrides / "remembrance_bosses.csv"),
            armor_shops=load_armor_shop_bosses(overrides / "boss_armor_shops.csv"),
            slot_links=load_slot_links(overrides / "boss_slot_links.csv"),
            ash_sources=loaded.ash_sources,
        )
    )
    return PlacementData(
        table=loaded.table,
        placements=placements,
        bosses=bosses,
        regions=regions,
        region_of_location=load_region_areas(
            overrides / "region_areas.csv", region_ids={region.id for region in regions}
        ),
        armor_sets=assign_armor_set_odds(
            build_armor_sets(load_armor_sets(overrides / "armor_sets.csv"), loaded.table),
            load_odds(overrides / "armor_set_odds.csv", "armor_set"),
        ),
    )
