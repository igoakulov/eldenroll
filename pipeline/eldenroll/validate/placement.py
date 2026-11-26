"""The placement data the gate and the tests check, and which items must have a location row."""

from __future__ import annotations

from collections.abc import Collection, Mapping
from dataclasses import dataclass
from pathlib import Path

from eldenroll.build.armor_sets import build_armor_sets
from eldenroll.build.boss_table import load_boss_instances, load_boss_overrides
from eldenroll.build.placement import (
    Placement,
    PlacementSources,
    build_placements,
    copied_placements,
    merged_labels,
)
from eldenroll.loaders.added_armor import load_added_armor
from eldenroll.loaders.armor_sets import load_armor_sets
from eldenroll.loaders.boss_links import (
    load_armor_shop_bosses,
    load_remembrance_bosses,
    load_slot_links,
)
from eldenroll.loaders.drop_areas import load_drop_areas
from eldenroll.loaders.drops import load_drop_locations, load_item_drops
from eldenroll.loaders.odds import load_odds
from eldenroll.loaders.placement_areas import load_placement_areas
from eldenroll.loaders.region_areas import load_region_areas
from eldenroll.loaders.regions import load_regions
from eldenroll.model.armor_set import ArmorSet
from eldenroll.model.boss_instance import BossInstance
from eldenroll.model.item import Item
from eldenroll.model.region import Region
from eldenroll.normalize.odds import assign_armor_set_odds
from eldenroll.normalize.placement_names import placement_names
from eldenroll.paths import ENEMY_DROPS, ENEMY_ITEM_LOTS
from eldenroll.validate.gaps import GapSources, load_sources


@dataclass(frozen=True, slots=True)
class PlacementData:
    table: tuple[Item, ...]
    placements: tuple[Placement, ...]
    bosses: tuple[BossInstance, ...]
    regions: tuple[Region, ...]
    region_of_location: Mapping[str, str]
    armor_sets: tuple[ArmorSet, ...]
    found_nowhere: frozenset[str]


def needs_location(item: Item, found_nowhere: Collection[str]) -> bool:
    """Return whether an item must have a row: every one but consumables, the empty rows (`none`
    and any id starting `none_`) and the pieces `added_armor.csv` places nowhere.
    """
    return (
        item.category not in ("consumable", "none")
        and not item.id.startswith("none_")
        and item.id not in found_nowhere
    )


def load_placement_sources(root: Path, loaded: GapSources) -> PlacementSources:
    overrides = root / "data" / "overrides"
    boss_overrides = load_boss_overrides(overrides)
    return PlacementSources(
        names=placement_names(loaded.table, loaded.catalog, loaded.variants),
        slots=loaded.slots,
        drops=load_drop_locations(ENEMY_DROPS),
        lots=load_item_drops(ENEMY_ITEM_LOTS),
        bosses=load_boss_instances(overrides),
        merged_labels=merged_labels(boss_overrides.merges),
        aliases=boss_overrides.aliases,
        remembrances=load_remembrance_bosses(overrides / "remembrance_bosses.csv"),
        armor_shops=load_armor_shop_bosses(overrides / "boss_armor_shops.csv"),
        slot_links=load_slot_links(overrides / "boss_slot_links.csv"),
        moved_areas=load_placement_areas(overrides / "placement_areas.csv"),
        drop_areas=load_drop_areas(overrides / "drop_areas.csv"),
        ash_sources=loaded.ash_sources,
    )


def load_placement_data(root: Path, sources: GapSources | None = None) -> PlacementData:
    overrides = root / "data" / "overrides"
    loaded = load_sources(root) if sources is None else sources
    placement_sources = load_placement_sources(root, loaded)
    bosses = tuple(placement_sources.bosses)
    regions = load_regions(overrides / "regions.csv")
    added = load_added_armor(overrides / "added_armor.csv")
    placements = copied_placements(build_placements(placement_sources), added, loaded.table)
    nowhere = {piece for piece, (_, copied) in added.items() if not copied}
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
        found_nowhere=frozenset(
            row.id for row in loaded.table if row.category == "armor" and row.name in nowhere
        ),
    )
