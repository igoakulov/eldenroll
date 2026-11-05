import type { BossInstance, Database } from "./database";

const ROYAL_CAPITAL = "leyndell";
const ASHEN_CAPITAL = "leyndell_ashen";
const SHUNNING_GROUNDS = ["sewer", "sewer_flame", "sewer_catacombs"];
const MALIKETH = "maliketh_the_black_blade_crumbling_farum_azula";

export const DEFAULT_REGIONS: readonly string[] = ["limgrave"];

export type BossPool =
  | { readonly status: "ready"; readonly bosses: readonly BossInstance[] }
  | { readonly status: "no_region" }
  | { readonly status: "no_bosses" }
  | { readonly status: "regions_cleared" }
  | { readonly status: "all_dead" };

/** The Ashen Capital replaces the Royal one, except for the Shunning-Grounds, which it reaches
 * whether or not the Royal Capital is selected. Maliketh's death turns the city into the Ashen
 * Capital at once, so it drops the Royal Capital too, without selecting the Ashen one. */
export function selectedLocations(
  database: Pick<Database, "location">,
  regions: ReadonlySet<string>,
  deadBosses: ReadonlySet<string> = new Set(),
): ReadonlySet<string> {
  const royalGone = regions.has(ASHEN_CAPITAL) || deadBosses.has(MALIKETH);
  const selected = new Set(
    database.location
      .filter(
        (row) =>
          regions.has(row.region_id) &&
          !(royalGone && row.region_id === ROYAL_CAPITAL && !SHUNNING_GROUNDS.includes(row.id)),
      )
      .map((row) => row.id),
  );
  if (regions.has(ASHEN_CAPITAL)) {
    for (const location of SHUNNING_GROUNDS) selected.add(location);
  }
  return selected;
}

/** A boss left alive in the Royal Capital after Maliketh's death can never be fought, so it must
 * not keep the run from finishing. */
function royalCapitalGone(
  database: Pick<Database, "location">,
  deadBosses: ReadonlySet<string>,
): ReadonlySet<string> {
  if (!deadBosses.has(MALIKETH)) return new Set();
  return new Set(
    database.location
      .filter((row) => row.region_id === ROYAL_CAPITAL && !SHUNNING_GROUNDS.includes(row.id))
      .map((row) => row.id),
  );
}

/** A skipped boss leaves the pool like a dead one, and counts as gone for finishing the run.
 * `bosses` keeps the table's row order, so a seed always samples the same sequence. */
export function bossPool(
  database: Pick<Database, "location" | "boss_instance">,
  regions: ReadonlySet<string>,
  deadBosses: ReadonlySet<string>,
  skippedBosses: ReadonlySet<string> = new Set(),
): BossPool {
  const out = (id: string) => deadBosses.has(id) || skippedBosses.has(id);
  const rollable = database.boss_instance.filter((row) => row.odds > 0);
  const gone = royalCapitalGone(database, deadBosses);
  const blocking = rollable.filter((row) => !gone.has(row.location_id));
  if (blocking.length > 0 && blocking.every((row) => out(row.id))) {
    return { status: "all_dead" };
  }
  if (regions.size === 0) return { status: "no_region" };

  const locations = selectedLocations(database, regions, deadBosses);
  const reachable = rollable.filter((row) => locations.has(row.location_id));
  if (reachable.length === 0) return { status: "no_bosses" };

  const bosses = reachable.filter((row) => !out(row.id));
  return bosses.length === 0 ? { status: "regions_cleared" } : { status: "ready", bosses };
}
