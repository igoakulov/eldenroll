import type { ArmorSet, BossInstance, ItemLocation } from "./database";
import type { EngineData } from "./engineData";

export interface Reachability {
  readonly locations: ReadonlySet<string>;
  readonly deadBosses: ReadonlySet<string>;
  readonly bossItemsOnlyFromDeadBosses: boolean;
}

/** One row of the `prd.md` §8.3 table. A boss at odds 0 acts as a regular enemy. */
export function rowCounts(
  row: ItemLocation,
  bosses: ReadonlyMap<string, BossInstance>,
  reachability: Reachability,
): boolean {
  const { locations, deadBosses, bossItemsOnlyFromDeadBosses } = reachability;
  if (row.location_id !== null) return locations.has(row.location_id);

  const boss = bosses.get(row.boss_instance_id ?? "");
  if (boss === undefined) return false;
  if (bossItemsOnlyFromDeadBosses && boss.odds > 0) return deadBosses.has(boss.id);
  return locations.has(boss.location_id);
}

/** An item with no row at all is found everywhere: a consumable, `none` or a `None` armor piece. */
export function countedItems(data: EngineData, reachability: Reachability): ReadonlySet<string> {
  return new Set([
    ...data.foundEverywhere,
    ...data.database.item_location
      .filter((row) => rowCounts(row, data.bosses, reachability))
      .map((row) => row.item_id),
  ]);
}

/** A set the data leaves short of a piece is not filtered; the missing slot shows `any`. */
export function isSetReachable(set: ArmorSet, counted: ReadonlySet<string>): boolean {
  return set.pieces.every((piece) => counted.has(piece));
}
