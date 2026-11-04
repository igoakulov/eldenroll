from __future__ import annotations

from dataclasses import dataclass

from eldenrando.model.alias import Alias
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.ash_compatibility import AshCompatibility
from eldenrando.model.boss_instance import BossInstance
from eldenrando.model.build import Build, SlotPool
from eldenrando.model.combat_rule import CombatRule
from eldenrando.model.item import Item
from eldenrando.model.item_location import ItemLocation
from eldenrando.model.location import Location
from eldenrando.model.modifier import Modifier
from eldenrando.model.region import Region


@dataclass(frozen=True, slots=True)
class Database:
    regions: tuple[Region, ...]
    locations: tuple[Location, ...]
    bosses: tuple[BossInstance, ...]
    items: tuple[Item, ...]
    armor_sets: tuple[ArmorSet, ...]
    ash_compatibility: tuple[AshCompatibility, ...]
    rules: tuple[CombatRule, ...]
    builds: tuple[Build, ...]
    slot_pools: tuple[SlotPool, ...]
    aliases: tuple[Alias, ...]
    item_locations: tuple[ItemLocation, ...]
    modifiers: tuple[Modifier, ...]
