import { describe, expect, it } from "vitest";

import type { Database } from "../engine/database";
import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { LOADOUT_ORDER } from "../engine/loadout";
import { realDatabase } from "../engine/realDatabase.testing";
import { reroll, startRun, type Engine } from "../engine/run";
import { STATS, defaultSettings, type Stats } from "../engine/settings";
import { REROLL_STOPS, rerollTarget } from "./rerollScope";

const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;

/** Every class as the data has it, and again with no spell or left hand, as a class may come to lack them. */
const DATABASES: readonly (readonly [string, Database])[] = [
  ["real", realDatabase],
  [
    "no spell or left hand",
    { ...realDatabase, slot_pool: realDatabase.slot_pool.filter((row) => !["spell", "lh", "lh_ash"].includes(row.slot)) },
  ],
];

describe("the reroll panel", () => {
  it.each(DATABASES)("changes something at every stop and nothing left of the lit chips (%s)", (_, database) => {
    const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
    for (const { id } of database.character_class) {
      const result = startRun(
        engine,
        {
          stats: MAXED,
          settings: { ...defaultSettings(database), characterClasses: [id] },
          regions: database.region.map((row) => row.id),
          weaponShortlist: [],
          deadBosses: [],
        },
        11,
      );
      if (!result.ok || result.run.current === null) throw new Error(`no objective for ${id}`);
      const run = result.run;
      const before = result.run.current;

      for (const { target } of REROLL_STOPS) {
        const next = reroll(engine, run, rerollTarget(before.slots, target));
        expect(next, `${id} from ${target}`).not.toBe(run);
        if (target === "boss" || target === "character_class") continue;
        for (const slot of LOADOUT_ORDER.slice(0, LOADOUT_ORDER.indexOf(target))) {
          expect(next.current?.slots[slot], `${id} from ${target} keeps ${slot}`).toBe(before.slots[slot]);
        }
      }
    }
  });
});
