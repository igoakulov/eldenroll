import { describe, expect, it } from "vitest";

import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { realDatabase } from "../engine/realDatabase.testing";
import { DEFAULT_REGIONS } from "../engine/regions";
import { done, rollNext, startRun, type Engine, type Run } from "../engine/run";
import { STATS, defaultSettings, type Stats } from "../engine/settings";
import { neverRollEntries, searchGear } from "./gearList";

const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const entries = neverRollEntries(realDatabase);
const items = new Map(realDatabase.item.map((item) => [item.id, item]));

function setsFound(query: string): string[] {
  return searchGear(entries, query)
    .filter((group) => group.kind === "armor_set")
    .flatMap((group) => group.rows.map((row) => row.entry.key));
}

describe("Never roll", () => {
  it("finds every set holding a piece, and a saved set never rolls", () => {
    const counts = new Map<string, number>();
    for (const set of realDatabase.armor_set)
      for (const piece of set.pieces) counts.set(piece, (counts.get(piece) ?? 0) + 1);
    const [shared] = [...counts].filter(([id]) => !id.startsWith("none_")).sort((a, b) => b[1] - a[1])[0] ?? [];
    const name = items.get(shared ?? "")?.name ?? "";
    const holding = realDatabase.armor_set
      .filter((set) => set.odds > 0 && set.pieces.includes(shared ?? ""))
      .map((set) => `armor_set:${set.id}`);
    expect(holding.length).toBeGreaterThan(1);
    expect(setsFound(name)).toEqual(expect.arrayContaining(holding));

    const result = startRun(
      engine,
      {
        stats: MAXED,
        settings: defaultSettings(realDatabase),
        regions: DEFAULT_REGIONS,
        weaponShortlist: [],
        deadBosses: [],
        neverRoll: holding,
      },
      3,
    );
    if (!result.ok) throw new Error(result.problems.join(", "));
    let run: Run = result.run;
    const excluded = new Set(holding.map((key) => key.slice("armor_set:".length)));
    for (let step = 0; step < 30 && run.current !== null; step += 1) {
      expect(excluded.has(run.current.slots.armor ?? "")).toBe(false);
      run = rollNext(engine, done(engine, run));
    }
  });

  it("never finds a set by its None pieces", () => {
    expect(setsFound(items.get("none_head")?.name ?? "none_head")).toEqual([]);
  });
});
