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
  /** Every item's `lateness` (how late its earliest region is) and `demand` (how far its stat
   * requirements reach), both 0 to 1, for `lateBoost` (`data/balance.md#Hyperparameters`). An item
   * with no location row, or no stat requirement, sits at 0 on that axis. `region` is the region that sets its
   * lateness, null for an item with no location row; `statTotal` the total `demand` is read from. */
  readonly lateOffset: ReadonlyMap<string, LateOffset>;
}

export interface LateOffset {
  readonly lateness: number;
  readonly demand: number;
  readonly region: string | null;
  readonly statTotal: number;
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

function lateOffsets(database: Database): ReadonlyMap<string, LateOffset> {
  const regionLevel = new Map(database.region.map((row) => [row.id, row.region_level]));
  const locationRegion = new Map(database.location.map((row) => [row.id, row.region_id]));
  const bossLocation = new Map(database.boss_instance.map((row) => [row.id, row.location_id]));
  const maxLevel = Math.max(1, ...database.region.map((row) => row.region_level));
  const native = new Map<string, { level: number; region: string }>();
  for (const row of database.item_location) {
    const locationId = row.location_id ?? (row.boss_instance_id === null ? null : bossLocation.get(row.boss_instance_id));
    const region = locationId === null || locationId === undefined ? undefined : locationRegion.get(locationId);
    const level = region === undefined ? undefined : regionLevel.get(region);
    if (region === undefined || level === undefined) continue;
    const current = native.get(row.item_id);
    if (current === undefined || level < current.level) native.set(row.item_id, { level, region });
  }
  const effectiveTotal = (row: Item): number => row.str / 1.5 + row.dex + row.int + row.fth + row.arc;
  const maxEffective = Math.max(1, ...database.item.map(effectiveTotal));
  const offsets = new Map<string, LateOffset>();
  for (const row of database.item) {
    const found = native.get(row.id);
    offsets.set(row.id, {
      lateness: ((found?.level ?? 1) - 1) / (maxLevel - 1 || 1),
      demand: effectiveTotal(row) / maxEffective,
      region: found?.region ?? null,
      statTotal: effectiveTotal(row),
    });
  }
  return offsets;
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
    lateOffset: lateOffsets(database),
    database,
    items: new Map(database.item.map((row) => [row.id, row])),
    rules: new Map(database.combat_rule.map((row) => [row.id, row])),
    armorSets: new Map(database.armor_set.map((row) => [row.id, row])),
    aliases: new Map(database.alias.map((row) => [row.id, row])),
    bosses: new Map(database.boss_instance.map((row) => [row.id, row])),
    pools: new Map(database.slot_pool.map((row) => [poolKey(row.character_class_id, row.slot), row])),
  };
}
