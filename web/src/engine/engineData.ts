import type {
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
  readonly bosses: ReadonlyMap<string, BossInstance>;
  readonly pools: ReadonlyMap<string, SlotPool>;
  readonly ashFits: ReadonlyMap<string, readonly AshCompatibility[]>;
}

export function poolKey(build: string, slot: PoolSlot): string {
  return `${build}/${slot}`;
}

export function indexDatabase(database: Database): EngineData {
  const ashFits = new Map<string, AshCompatibility[]>();
  for (const row of database.ash_compatibility) {
    ashFits.set(row.ash_id, [...(ashFits.get(row.ash_id) ?? []), row]);
  }
  return {
    ashFits,
    database,
    items: new Map(database.item.map((row) => [row.id, row])),
    rules: new Map(database.combat_rule.map((row) => [row.id, row])),
    bosses: new Map(database.boss_instance.map((row) => [row.id, row])),
    pools: new Map(database.slot_pool.map((row) => [poolKey(row.build_id, row.slot), row])),
  };
}
