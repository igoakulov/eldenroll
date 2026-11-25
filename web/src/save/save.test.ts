import { describe, expect, it } from "vitest";

import { indexDatabase } from "../engine/engineData";
import { LOADOUT_ORDER } from "../engine/loadout";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { realDatabase } from "../engine/realDatabase.testing";
import { done, reroll, rollNext, startRun, type Engine, type Run } from "../engine/run";
import { STATS, defaultSettings, type Stats } from "../engine/settings";
import { PAST_RUNS_CAP, packFinished, recordOf, unpackFinished } from "./finished";
import { SCHEMA_VERSION, restoreRun, restoreSetup, type Fresh } from "./restore";
import { keyValueStore, type KeyValue } from "./store";

const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const FRESH: Fresh = { seed: () => 1, id: () => "fresh", now: () => "2026-11-25T00:00:00.000Z" };
const REGIONS = realDatabase.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen");

function memory(): KeyValue & { readonly entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

function played(objectives: number): Run {
  const result = startRun(
    engine,
    { stats: MAXED, settings: defaultSettings(realDatabase), regions: REGIONS, weaponShortlist: [], deadBosses: [] },
    42,
  );
  if (!result.ok) throw new Error(result.problems.join(", "));
  let run = result.run;
  for (let n = 0; n < objectives; n += 1) run = rollNext(engine, done(engine, reroll(engine, run, "rh")));
  return run;
}

/** Saves `run` as the app does and reads it back, as after a reload. */
async function reloaded(run: Run, edit: (saved: Record<string, unknown>) => void = () => {}): Promise<Run> {
  const storage = memory();
  const store = keyValueStore(storage);
  store.saveActive({ schemaVersion: SCHEMA_VERSION, runId: "run", startedAt: "t", updatedAt: "t", run });
  const saved = JSON.parse(storage.entries.get("eldenroll.active") ?? "") as { run: Record<string, unknown> };
  edit(saved.run);
  storage.setItem("eldenroll.active", JSON.stringify(saved));
  const restored = restoreRun(engine, (await store.load()).active, FRESH);
  if (restored === null) throw new Error("nothing restored");
  return restored.run;
}

describe("saving the run", () => {
  it("rolls on after a reload exactly as without one", async () => {
    const run = played(3);
    const after = await reloaded(run);
    const next = (one: Run) => rollNext(engine, done(engine, reroll(engine, reroll(engine, one, "lh"), "boss")));
    expect(next(after)).toEqual(next(run));
  });

  it("rerolls from the slot whose item is gone from the data, keeping what rolled before it", async () => {
    const run = played(2);
    const objective = run.current;
    if (objective === null) throw new Error("no objective");
    // The last slot holding an item, so the boss, the class and several slots come before it
    const gone = LOADOUT_ORDER.filter((slot) => typeof objective.slots[slot] === "string").at(-1);
    if (gone === undefined) throw new Error("no item rolled");
    const after = await reloaded(run, (saved) => {
      (saved.current as { slots: Record<string, unknown> }).slots[gone] = "gone_from_the_data";
      const first = (saved.completed as { slots: Record<string, unknown> }[])[0];
      if (first !== undefined) first.slots.rh = "also_gone";
      saved.weaponShortlist = ["gone_from_the_data"];
    });
    const kept = LOADOUT_ORDER.slice(0, LOADOUT_ORDER.indexOf(gone));
    expect(after.current).toMatchObject({
      boss: objective.boss,
      characterClass: objective.characterClass,
      rerolls: objective.rerolls,
      slots: Object.fromEntries(kept.flatMap((slot) => (slot in objective.slots ? [[slot, objective.slots[slot]]] : []))),
    });
    expect(after.current?.slots[gone]).not.toBe("gone_from_the_data");
    expect(after.completed.map((one) => one.boss)).toEqual(run.completed.map((one) => one.boss));
    expect(after.weaponShortlist).toEqual([]);
    expect(() => reroll(engine, after, "rh_ash")).not.toThrow();
  });

  it("rolls a new objective when its boss is gone from the data", async () => {
    const after = await reloaded(played(1), (saved) => {
      (saved.current as Record<string, unknown>).boss = "gone_boss";
    });
    expect(after.current?.boss).toBeDefined();
    expect(engine.data.bosses.has(after.current?.boss ?? "")).toBe(true);
  });

  it("keeps going from a save with no tally", async () => {
    const after = await reloaded(played(1), (saved) => {
      delete saved.tally;
      delete (saved.current as Record<string, unknown>).tally;
    });
    const next = rollNext(engine, done(engine, reroll(engine, after, "talisman_1")));
    expect(next.completed).toHaveLength(after.completed.length + 1);
    expect(next.current).not.toBeNull();
  });

  it("sets aside a save it can't read, and Start opens fresh", async () => {
    const storage = memory();
    storage.setItem("eldenroll.active", "{not json");
    const loaded = await keyValueStore(storage).load();
    expect(loaded.active).toBeNull();
    expect(storage.entries.get("eldenroll.active.unreadable")).toBe("{not json");
  });
});

describe("saving Start's setup", () => {
  it("brings back stats, regions and the shortlist after a reload, dropping what the data lost", async () => {
    const storage = memory();
    const store = keyValueStore(storage);
    const settings = { ...defaultSettings(realDatabase), weaponShortlistEnabled: true };
    const shortlist = realDatabase.item.filter((row) => row.category === "weapon").slice(0, 2).map((row) => row.id);
    store.saveSetup({
      schemaVersion: SCHEMA_VERSION,
      stats: MAXED,
      settings,
      regions: [...REGIONS.slice(0, 3), "gone_region"],
      weaponShortlist: [...shortlist, "gone_weapon"],
      neverRoll: [],
      deadBosses: [],
      skippedBosses: [],
    });
    const setup = restoreSetup(engine.data, (await store.load()).setup);
    expect(setup).toMatchObject({ stats: MAXED, settings, regions: REGIONS.slice(0, 3), weaponShortlist: shortlist });
  });
});

describe("finished runs", () => {
  it("keep every objective as played", () => {
    const run = played(5);
    const meta = { runId: "run", startedAt: "s", finishedAt: "f" };
    const back = unpackFinished(JSON.parse(JSON.stringify(packFinished(run, meta))));
    expect(back).toEqual({ ...meta, ...recordOf(run) });
    expect(back?.rerolls).toBe(5);
    expect(Object.keys(back?.replaced ?? {}).length).toBeGreaterThan(0);
  });

  it("keep a run once when two tabs both finish it", async () => {
    const store = keyValueStore(memory());
    const run = packFinished(played(1), { runId: "run", startedAt: "s", finishedAt: "f" });
    store.addFinished(run);
    store.addFinished(run);
    expect((await store.load()).past).toHaveLength(1);
  });

  it("drop the oldest past the cap", async () => {
    const storage = memory();
    const store = keyValueStore(storage);
    const run = played(1);
    for (let n = 0; n <= PAST_RUNS_CAP; n += 1)
      store.addFinished(packFinished(run, { runId: `run ${n}`, startedAt: "s", finishedAt: "f" }));
    const past = (await store.load()).past.map((one) => unpackFinished(one)?.runId);
    expect(past).toHaveLength(PAST_RUNS_CAP);
    expect(past[0]).toBe(`run ${PAST_RUNS_CAP}`);
    expect(past).not.toContain("run 0");
  });
});
