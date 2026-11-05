import type { BossInstance, Database } from "./database";

const ROYAL_CAPITAL = "leyndell";
const ASHEN_CAPITAL = "leyndell_ashen";
const SHUNNING_GROUNDS = ["sewer", "sewer_flame", "sewer_catacombs"];

export const DEFAULT_REGIONS: readonly string[] = ["limgrave"];

export type BossPool =
  | { readonly status: "ready"; readonly bosses: readonly BossInstance[] }
  | { readonly status: "no_region" }
  | { readonly status: "no_bosses" }
  | { readonly status: "regions_cleared" }
  | { readonly status: "all_dead" };

/** The Ashen Capital replaces the Royal one, except for the Shunning-Grounds, which it reaches
 * whether or not the Royal Capital is selected. */
export function selectedLocations(
  database: Pick<Database, "location">,
  regions: ReadonlySet<string>,
): ReadonlySet<string> {
  const ashen = regions.has(ASHEN_CAPITAL);
  const selected = new Set(
    database.location
      .filter((row) => regions.has(row.region_id) && !(ashen && row.region_id === ROYAL_CAPITAL))
      .map((row) => row.id),
  );
  if (ashen) {
    for (const location of SHUNNING_GROUNDS) selected.add(location);
  }
  return selected;
}

/** `bosses` keeps the table's row order, so a seed always samples the same sequence. */
export function bossPool(
  database: Pick<Database, "location" | "boss_instance">,
  regions: ReadonlySet<string>,
  deadBosses: ReadonlySet<string>,
): BossPool {
  const rollable = database.boss_instance.filter((row) => row.odds > 0);
  if (rollable.length > 0 && rollable.every((row) => deadBosses.has(row.id))) {
    return { status: "all_dead" };
  }
  if (regions.size === 0) return { status: "no_region" };

  const locations = selectedLocations(database, regions);
  const reachable = rollable.filter((row) => locations.has(row.location_id));
  if (reachable.length === 0) return { status: "no_bosses" };

  const bosses = reachable.filter((row) => !deadBosses.has(row.id));
  return bosses.length === 0 ? { status: "regions_cleared" } : { status: "ready", bosses };
}
