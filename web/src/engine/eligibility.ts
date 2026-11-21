import type { ArmorSet, BossInstance, ItemLocation } from "./database";
import type { EngineData } from "./engineData";

export interface Reachability {
  readonly locations: ReadonlySet<string>;
  readonly deadBosses: ReadonlySet<string>;
}

/** One row of the `web/src/engine/README.md#Eligibility` table. A boss at odds 0 acts as a regular enemy. */
export function rowCounts(
  row: ItemLocation,
  bosses: ReadonlyMap<string, BossInstance>,
  reachability: Reachability,
): boolean {
  const { locations, deadBosses } = reachability;
  if (row.location_id !== null) return locations.has(row.location_id);

  const boss = bosses.get(row.boss_instance_id ?? "");
  if (boss === undefined) return false;
  if (boss.odds > 0) return deadBosses.has(boss.id);
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

/** A set the data leaves short of a piece is not filtered; the missing slot shows `any`. A piece in an alias stands
 * for every member, so it counts once any member does (`Jar / Greatjar`). */
export function isSetReachable(data: EngineData, set: ArmorSet, counted: ReadonlySet<string>): boolean {
  return set.pieces.every((piece) => {
    const alias = data.items.get(piece)?.alias;
    return counted.has(piece) || (alias != null && (data.aliasMembers.get(alias) ?? []).some((id) => counted.has(id)));
  });
}
