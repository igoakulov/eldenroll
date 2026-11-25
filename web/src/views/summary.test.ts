import { describe, expect, it } from "vitest";

import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { realDatabase } from "../engine/realDatabase.testing";
import { DEFAULT_REGIONS } from "../engine/regions";
import { done, rollNext, setBossState, startRun, type Engine } from "../engine/run";
import { DEFAULT_STATS, defaultSettings } from "../engine/settings";
import { recordOf, type FinishedObjective, type RunRecord } from "../save/finished";
import { summarize } from "./summary";

const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const items = realDatabase.item;

function first<T>(rows: readonly T[], test: (row: T) => boolean): T {
  const found = rows.find(test);
  if (found === undefined) throw new Error("no such row in the data");
  return found;
}

const staff = first(items, (row) => row.alias === "any_staff");
const torches = items.filter((row) => row.alias === "any_torch");
const torchLabel = first(realDatabase.alias, (row) => row.id === "any_torch").label;
const sword = first(items, (row) => row.category === "weapon" && row.alias === null);
const shield = first(items, (row) => row.category === "shield" && row.alias === null);
const sorcery = first(items, (row) => row.category === "sorcery");
const incantation = first(items, (row) => row.category === "incantation");
const set = first(realDatabase.armor_set, () => true);
const [classA, classB] = realDatabase.character_class;
const boss = first(realDatabase.boss_instance, (row) => row.odds > 0);

function objective(characterClass: string, slots: FinishedObjective["slots"], shortlistRh = false): FinishedObjective {
  return { boss: boss.id, characterClass, slots, shortlistRh, stats: DEFAULT_STATS };
}

describe("Summary", () => {
  it("counts unique gear by label, leaving out staves and seals, and ranks the rerolled with ties by name", () => {
    if (classA === undefined || classB === undefined || torches.length < 2) throw new Error("data too small");
    const [torch1, torch2] = torches as [(typeof torches)[0], (typeof torches)[0]];
    const record: RunRecord = {
      objectives: [
        objective(classA.id, { rh: staff.id, lh: shield.id, spell: sorcery.id, armor: set.id }),
        objective(classB.id, { rh: torch1.id, lh: sword.id, spell: incantation.id, armor: set.id }, true),
        objective(classB.id, { rh: torch2.id, lh: null, spell: null, armor: null }),
      ],
      deadBosses: [],
      skippedBosses: [],
      rerolls: 12,
      replaced: { [torch1.id]: 2, [torch2.id]: 1, [boss.id]: 3, none: 5, gone_blade_of_old: 1 },
    };
    const summary = summarize(engine.data, record);

    expect(summary.gear.weapons.map((entry) => entry.name)).toEqual([torchLabel, sword.name].sort());
    expect(summary.gear.shields.map((entry) => entry.name)).toEqual([shield.name]);
    expect(summary.gear.sorceries).toHaveLength(1);
    expect(summary.gear.incantations).toHaveLength(1);
    expect(summary.gear.armor_sets).toHaveLength(1);
    expect(summary.gear.shortlist.map((entry) => entry.name)).toEqual([torchLabel]);
    expect(summary.uniqueGear).toBe(6);
    expect(summary.topClasses).toEqual([
      { id: classB.id, name: classB.name, count: 2 },
      { id: classA.id, name: classA.name, count: 1 },
    ]);
    expect(summary.mostRerolled.map((row) => [row.name, row.count])).toEqual([
      ...[
        [torchLabel, 3],
        [boss.name, 3],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "en")),
      ["Gone Blade Of Old", 1],
    ]);
  });

  it("counts bosses felled on the way and before the run, and names the skipped", () => {
    const started = startRun(
      engine,
      {
        stats: DEFAULT_STATS,
        settings: defaultSettings(realDatabase),
        regions: DEFAULT_REGIONS,
        weaponShortlist: [],
        deadBosses: [],
      },
      7,
    );
    if (!started.ok) throw new Error(started.problems.join(", "));
    const pool = realDatabase.boss_instance.filter((row) => row.odds > 0 && row.id !== started.run.current?.boss);
    const [before, skipped] = pool as [typeof boss, typeof boss];
    let run = setBossState(engine, started.run, before.id, "dead");
    run = setBossState(engine, run, skipped.id, "skipped");
    run = rollNext(engine, done(engine, run));
    run = done(engine, run);

    const summary = summarize(engine.data, recordOf(run));
    expect(summary.objectives).toBe(2);
    expect(summary.bossesFelled).toBe(3);
    expect(summary.skipped).toEqual([{ id: skipped.id, name: skipped.name, location: skipped.location }]);
  });
});
