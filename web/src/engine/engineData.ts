import type {
  Alias,
  ArmorSet,
  AshCompatibility,
  BossInstance,
  CombatRule,
  Database,
  Item,
  PoolSlot,
  SlotPool,
} from "./database";

export interface EngineData {
  readonly database: Database;
  readonly items: ReadonlyMap<string, Item>;
  readonly rules: ReadonlyMap<string, CombatRule>;
  readonly armorSets: ReadonlyMap<string, ArmorSet>;
  readonly aliases: ReadonlyMap<string, Alias>;
  readonly bosses: ReadonlyMap<string, BossInstance>;
  readonly pools: ReadonlyMap<string, SlotPool>;
  readonly ashFits: ReadonlyMap<string, readonly AshCompatibility[]>;
  /** Items with no location row. */
  readonly foundEverywhere: ReadonlySet<string>;
}

export function poolKey(characterClass: string, slot: PoolSlot): string {
  return `${characterClass}/${slot}`;
}

export function indexDatabase(database: Database): EngineData {
  const ashFits = new Map<string, AshCompatibility[]>();
  for (const row of database.ash_compatibility) {
    ashFits.set(row.ash_id, [...(ashFits.get(row.ash_id) ?? []), row]);
  }
  const placed = new Set(database.item_location.map((row) => row.item_id));
  return {
    ashFits,
    foundEverywhere: new Set(database.item.filter((row) => !placed.has(row.id)).map((row) => row.id)),
    database,
    items: new Map(database.item.map((row) => [row.id, row])),
    rules: new Map(database.combat_rule.map((row) => [row.id, row])),
    armorSets: new Map(database.armor_set.map((row) => [row.id, row])),
    aliases: new Map(database.alias.map((row) => [row.id, row])),
    bosses: new Map(database.boss_instance.map((row) => [row.id, row])),
    pools: new Map(database.slot_pool.map((row) => [poolKey(row.character_class_id, row.slot), row])),
  };
}
