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
  /** How many options repeat the same key's decay: every `repeatKey` mapped to the size of its
   * item category or its rule or armor-set table (`data/balance.md#Hyperparameters`). Classes
   * don't decay, so no `character_class:` key is here. A key missing here (none else should be)
   * falls back to 1 in `repetitionMultiplier`. */
  readonly decayGroupSize: ReadonlyMap<string, number>;
}

export function poolKey(characterClass: string, slot: PoolSlot): string {
  return `${characterClass}/${slot}`;
}

function decayGroups(database: Database): ReadonlyMap<string, number> {
  const byCategory = new Map<string, number>();
  for (const row of database.item) byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
  const sizes = new Map<string, number>();
  for (const row of database.item) sizes.set(`item:${row.id}`, byCategory.get(row.category) ?? 1);
  for (const row of database.alias) {
    const member = database.item.find((item) => item.alias === row.id);
    if (member !== undefined) sizes.set(`alias:${row.id}`, byCategory.get(member.category) ?? 1);
  }
  for (const row of database.combat_rule) sizes.set(`rule:${row.id}`, database.combat_rule.length);
  for (const row of database.armor_set) sizes.set(`armor_set:${row.id}`, database.armor_set.length);
  return sizes;
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
    decayGroupSize: decayGroups(database),
    database,
    items: new Map(database.item.map((row) => [row.id, row])),
    rules: new Map(database.combat_rule.map((row) => [row.id, row])),
    armorSets: new Map(database.armor_set.map((row) => [row.id, row])),
    aliases: new Map(database.alias.map((row) => [row.id, row])),
    bosses: new Map(database.boss_instance.map((row) => [row.id, row])),
    pools: new Map(database.slot_pool.map((row) => [poolKey(row.character_class_id, row.slot), row])),
  };
}
