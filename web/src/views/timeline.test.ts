import { describe, expect, it } from "vitest";

import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { realDatabase } from "../engine/realDatabase.testing";
import { alreadyDead, done, rollNext, setBossState, startRun, type Engine, type Run } from "../engine/run";
import { DEFAULT_STATS, defaultSettings } from "../engine/settings";
import { recordOf } from "../save/finished";
import { hitIn, holds, searchRun, timelineItems } from "./timeline";

const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const ALL_REGIONS = realDatabase.region.map((row) => row.id);

function started(): Run {
  const result = startRun(
    engine,
    { stats: DEFAULT_STATS, settings: defaultSettings(realDatabase), regions: ALL_REGIONS, weaponShortlist: [], deadBosses: [] },
    11,
  );
  if (!result.ok) throw new Error(result.problems.join(", "));
  return result.run;
}

function aliveBoss(run: Run): string {
  const found = realDatabase.boss_instance.find(
    (boss) =>
      boss.odds > 0 &&
      boss.id !== run.current?.boss &&
      !run.deadBosses.some((row) => row.instanceId === boss.id) &&
      !run.skippedBosses.includes(boss.id),
  );
  if (found === undefined) throw new Error("no boss left alive");
  return found.id;
}

describe("Timeline", () => {
  it("puts bosses felled on the way just before the objective they were marked under, and the unfinished one's last", () => {
    let run = started();
    const before = aliveBoss(run);
    run = setBossState(engine, run, before, "dead");
    const first = run.current?.boss;
    run = alreadyDead(engine, run);
    run = rollNext(engine, done(engine, run));
    const during = run.current?.boss;
    run = rollNext(engine, done(engine, alreadyDead(engine, run)));
    const skipped = aliveBoss(run);
    run = setBossState(engine, run, skipped, "skipped");
    const unfinished = run.current?.boss;
    run = alreadyDead(engine, run);

    const items = timelineItems(recordOf(run));
    expect(items.map((item) => item.kind)).toEqual(["felled", "objective", "felled", "objective", "felled"]);
    expect(items[0]).toEqual({ kind: "felled", bosses: [before, first] });
    expect(items[2]).toEqual({ kind: "felled", bosses: [during] });
    expect(items[4]).toEqual({ kind: "felled", bosses: [unfinished] });
    expect(searchRun(engine.data, items, engine.data.bosses.get(skipped)?.name ?? "").flatMap((section) => section.picks.map((pick) => pick.key))).not.toContain(`boss:${skipped}`);
  });

  it("finds a picked item in the objectives that held it, with the slot it was in", () => {
    let run = started();
    for (let n = 0; n < 6; n += 1) run = rollNext(engine, done(engine, run));
    const items = timelineItems(recordOf(run));
    const plain = (id: string | null | undefined) => {
      const item = id === null || id === undefined ? undefined : engine.data.items.get(id);
      return item?.category === "weapon" && item.alias === null ? item : undefined;
    };
    const objective = recordOf(run).objectives.find((one) => plain(one.slots.rh) !== undefined);
    const weapon = plain(objective?.slots.rh);
    if (objective === undefined || weapon === undefined) throw new Error("no plain weapon rolled in the right hand");

    const picks = searchRun(engine.data, items, weapon.name).flatMap((section) => section.picks);
    const pick = picks.find((one) => one.key === `item:${weapon.id}`);
    expect(pick?.group).toBe(weapon.category);
    const held = items.filter((item) => holds(engine.data, item, `item:${weapon.id}`));
    expect(held.length).toBeGreaterThan(0);
    expect(hitIn(engine.data, objective, `item:${weapon.id}`)?.name).toBe(weapon.name);
    expect(hitIn(engine.data, objective, `boss:${objective.boss}`)).toBeNull();
  });
});
