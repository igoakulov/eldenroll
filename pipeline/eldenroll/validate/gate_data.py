from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from eldenroll.build.aliases import build_aliases
from eldenroll.build.boss_table import load_boss_overrides, load_boss_rows
from eldenroll.build.bosses import BossOverrides
from eldenroll.build.locations import build_locations
from eldenroll.build.modifiers import build_modifiers
from eldenroll.build.placement import DroppedValue, dropped_values, item_locations
from eldenroll.build.slot_pools import build_slot_pools
from eldenroll.build.wiki import with_wiki_urls
from eldenroll.loaders.added_items import load_added_items
from eldenroll.loaders.aliases import AliasRow, load_aliases
from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.character_classes import load_character_classes, load_slot_pools
from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.modifiers import load_modifiers
from eldenroll.loaders.str_bonus import load_str_bonus
from eldenroll.loaders.wiki_urls import load_wiki_urls
from eldenroll.model.database import Database
from eldenroll.paths import AREAS
from eldenroll.validate.gaps import GapSources, load_overrides, load_sources
from eldenroll.validate.placement import load_placement_data, load_placement_sources


@dataclass(frozen=True, slots=True)
class GateData:
    database: Database
    sources: GapSources
    boss_overrides: BossOverrides
    boss_rows: tuple[tuple[str, str], ...]
    dlc_locations: frozenset[str]
    str_bonus: Mapping[str, bool]
    alias_rows: tuple[AliasRow, ...]
    added_items: tuple[str, ...]
    override_items: Mapping[str, frozenset[str]]
    dropped: tuple[DroppedValue, ...]
    found_nowhere: frozenset[str]


def load_gate_data(root: Path) -> GateData:
    overrides = root / "data" / "overrides"
    sources = load_sources(root)
    placement = load_placement_data(root, sources)
    areas = load_annotations(AREAS).areas
    alias_rows = load_aliases(overrides / "aliases.csv")
    return GateData(
        database=with_wiki_urls(
            Database(
                regions=placement.regions,
                locations=build_locations(areas, placement.region_of_location),
                bosses=placement.bosses,
                items=placement.table,
                armor_sets=placement.armor_sets,
                ash_compatibility=sources.ash_compatibility,
                rules=load_combat_rules(overrides / "combat_rules.csv"),
                character_classes=load_character_classes(overrides / "character_classes.csv"),
                slot_pools=build_slot_pools(load_slot_pools(overrides / "slot_pools.csv")),
                aliases=build_aliases(alias_rows),
                item_locations=item_locations(placement.placements),
                modifiers=build_modifiers(load_modifiers(overrides / "modifiers.csv")),
            ),
            load_wiki_urls(overrides / "wiki_urls.csv"),
        ),
        sources=sources,
        boss_overrides=load_boss_overrides(overrides),
        boss_rows=load_boss_rows(),
        dlc_locations=frozenset(area.name for area in areas if area.is_dlc),
        str_bonus=load_str_bonus(overrides / "str_bonus_2h.csv"),
        alias_rows=alias_rows,
        added_items=tuple(load_added_items(overrides / "items.csv")),
        override_items=load_overrides(overrides),
        dropped=tuple(dropped_values(load_placement_sources(root, sources))),
        found_nowhere=placement.found_nowhere,
    )
