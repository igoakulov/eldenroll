// Golden fixtures (web/src/engine/README.md#Golden fixtures): fixed runs whose rolls are saved; a change in what rolls
// fails here and its diff shows which rolls moved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Database } from "./database";
import { indexDatabase } from "./engineData";
import { DEFAULT_HYPERPARAMS } from "./hyperparams";
import { realDatabase } from "./realDatabase.testing";
import { done, reroll, rollNext, startRun, type Engine, type Run, type RunInputs } from "./run";
import { DEFAULT_STATS, STATS, defaultSettings, type Stats } from "./settings";

const FROZEN = JSON.parse(readFileSync(new URL("./golden/db.json", import.meta.url), "utf8")) as Database;
const MARGIT = "margit_the_fell_omen_stormveil_castle";
const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const OBJECTIVES = 4;

function objectives(run: Run) {
  return [...run.completed, ...(run.current === null ? [] : [run.current])].map((one) => ({
    boss: one.boss,
    characterClass: one.characterClass,
    slots: Object.fromEntries(Object.entries(one.slots).sort(([a], [b]) => a.localeCompare(b))),
  }));
}

function cases(database: Database) {
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  const everyRegion = database.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen");
  const settings = defaultSettings(database);
  const start = (changes: Partial<RunInputs>, seed: number): Run => {
    const result = startRun(
      engine,
      { stats: MAXED, settings, regions: everyRegion, weaponShortlist: [], deadBosses: [], ...changes },
      seed,
    );
    if (!result.ok) throw new Error(result.problems.join(", "));
    return result.run;
  };
  const play = (run: Run): Run => {
    let next = run;
    for (let n = 1; n < OBJECTIVES; n += 1) next = rollNext(engine, done(engine, next));
    return next;
  };
  const only = (characterClass: string) => ({ settings: { ...settings, characterClasses: [characterClass] } });
  const out: Record<string, unknown> = {};
  database.character_class.forEach((row, index) => {
    out[`${row.id}, every region, nothing felled`] = objectives(play(start(only(row.id), 100 + index)));
  });
  for (const characterClass of ["knight", "jester"]) {
    out[`${characterClass}, Margit felled`] = objectives(play(start({ ...only(characterClass), deadBosses: [MARGIT] }, 200)));
  }
  out["sorcerer, Limgrave only, starting stats"] = objectives(
    play(start({ ...only("sorcerer"), regions: ["limgrave"], stats: DEFAULT_STATS }, 300)),
  );
  out["knight, weapon shortlist"] = objectives(
    play(start({ settings: { ...settings, characterClasses: ["knight"], weaponShortlistEnabled: true }, weaponShortlist: ["uchigatana", "longsword"] }, 400)),
  );
  const rerolled = start(only("warrior_2h"), 500);
  out["warrior_2h, rerolls"] = {
    hands: objectives(reroll(engine, rerolled, "rh")),
    items: objectives(reroll(engine, rerolled, "character_class")),
    objective: objectives(reroll(engine, rerolled, "boss")),
  };
  return `${JSON.stringify(out, null, 2)}\n`;
}

describe("golden fixtures", () => {
  it("roll the frozen database as saved, so the engine rolls as it did", async () => {
    await expect(cases(FROZEN)).toMatchFileSnapshot("./golden/frozen.json");
  });

  it("roll the real database as saved, so a data change shows which rolls moved", async () => {
    await expect(cases(realDatabase)).toMatchFileSnapshot("./golden/live.json");
  });
});
