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
  /** By `optionKey`, for items and armor sets: the catch-up boost's ceiling, the share of a typical
   * run still ahead when it comes into reach. An item takes its earliest region's `run_left`, a set
   * its latest piece's; one with no location row is in reach from the start, at 1. */
  readonly runLeft: ReadonlyMap<string, number>;
}

export function poolKey(characterClass: string, slot: PoolSlot): string {
  return `${characterClass}/${slot}`;
}

function runLefts(database: Database): ReadonlyMap<string, number> {
  const regionLeft = new Map(database.region.map((row) => [row.id, row.run_left]));
  const locationRegion = new Map(database.location.map((row) => [row.id, row.region_id]));
  const bossLocation = new Map(database.boss_instance.map((row) => [row.id, row.location_id]));
  const itemLeft = new Map<string, number>();
  for (const row of database.item_location) {
    const locationId = row.location_id ?? (row.boss_instance_id === null ? undefined : bossLocation.get(row.boss_instance_id));
    const region = locationId === undefined ? undefined : locationRegion.get(locationId);
    const left = region === undefined ? undefined : regionLeft.get(region);
    if (left === undefined) continue;
    itemLeft.set(row.item_id, Math.max(itemLeft.get(row.item_id) ?? 0, left));
  }
  const keys = new Map<string, number>();
  for (const row of database.item) keys.set(`item:${row.id}`, itemLeft.get(row.id) ?? 1);
  for (const row of database.armor_set) {
    keys.set(`armor_set:${row.id}`, Math.min(1, ...row.pieces.map((piece) => itemLeft.get(piece) ?? 1)));
  }
  return keys;
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
    runLeft: runLefts(database),
    database,
    items: new Map(database.item.map((row) => [row.id, row])),
    rules: new Map(database.combat_rule.map((row) => [row.id, row])),
    armorSets: new Map(database.armor_set.map((row) => [row.id, row])),
    aliases: new Map(database.alias.map((row) => [row.id, row])),
    bosses: new Map(database.boss_instance.map((row) => [row.id, row])),
    pools: new Map(database.slot_pool.map((row) => [poolKey(row.character_class_id, row.slot), row])),
  };
}
