import { describe, expect, it } from "vitest";

import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { realDatabase } from "../engine/realDatabase.testing";
import { DEFAULT_REGIONS } from "../engine/regions";
import { done, rollNext, setBossState, startRun, type Engine, type Run } from "../engine/run";
import { STATS, defaultSettings, type Stats } from "../engine/settings";
import { boardOf, bossSections } from "./bossList";

const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const bosses = realDatabase.boss_instance.filter((boss) => boss.odds > 0);

function secondObjective(): Run {
  const result = startRun(
    engine,
    {
      stats: MAXED,
      settings: defaultSettings(realDatabase),
      regions: DEFAULT_REGIONS,
      weaponShortlist: [],
      deadBosses: [],
    },
    7,
  );
  if (!result.ok) throw new Error(result.problems.join(", "));
  return rollNext(engine, done(engine, result.run));
}

describe("Bosses", () => {
  it("lists marked bosses and the ones felled in objectives, never an alive one, until searched", () => {
    const played = secondObjective();
    const felled = played.completed[0]?.boss;
    const marked = bosses.find((boss) => boss.id !== felled && boss.id !== played.current?.boss);
    if (felled === undefined || marked === undefined) throw new Error("no boss to mark");
    const run = setBossState(engine, played, marked.id, "skipped");
    const board = boardOf(run);

    expect(bossSections(bosses, board, board.states, "")).toEqual([
      { kind: "skipped", rows: [{ boss: marked }] },
      { kind: "objectives", rows: [{ boss: bosses.find((boss) => boss.id === felled), objective: 1 }] },
    ]);

    const current = bosses.find((boss) => boss.id === run.current?.boss);
    if (current === undefined) throw new Error("no current boss");
    const alive = bossSections(bosses, board, board.states, current.name).find((section) => section.kind === "alive");
    expect(alive?.rows).toContainEqual({ boss: current, match: [0, current.name.length] });
  });
});
