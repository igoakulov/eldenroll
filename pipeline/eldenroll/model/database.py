from __future__ import annotations

from dataclasses import dataclass

from eldenroll.model.alias import Alias
from eldenroll.model.armor_set import ArmorSet
from eldenroll.model.ash_compatibility import AshCompatibility
from eldenroll.model.boss_instance import BossInstance
from eldenroll.model.character_class import CharacterClass, SlotPool
from eldenroll.model.combat_rule import CombatRule
from eldenroll.model.item import Item
from eldenroll.model.item_location import ItemLocation
from eldenroll.model.location import Location
from eldenroll.model.modifier import Modifier
from eldenroll.model.region import Region


@dataclass(frozen=True, slots=True)
class Database:
    regions: tuple[Region, ...]
    locations: tuple[Location, ...]
    bosses: tuple[BossInstance, ...]
    items: tuple[Item, ...]
    armor_sets: tuple[ArmorSet, ...]
    ash_compatibility: tuple[AshCompatibility, ...]
    rules: tuple[CombatRule, ...]
    character_classes: tuple[CharacterClass, ...]
    slot_pools: tuple[SlotPool, ...]
    aliases: tuple[Alias, ...]
    item_locations: tuple[ItemLocation, ...]
    modifiers: tuple[Modifier, ...]
