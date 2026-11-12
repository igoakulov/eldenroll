import { describe, expect, it } from "vitest";

import { indexDatabase } from "./engineData";
import { DEFAULT_HYPERPARAMS } from "./hyperparams";
import { realDatabase } from "./realDatabase.testing";
import {
  alreadyDead,
  done,
  editRun,
  finishRun,
  reroll,
  rollNext,
  setBossState,
  bossStatus,
  startRun,
  type Engine,
  type Run,
  type RunInputs,
} from "./run";
import { DEFAULT_STATS, STATS, defaultSettings, type Stats } from "./settings";
import { NO_REPETITION, slotOptions, weighOptions } from "./slotRoll";

const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };
const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const ASHEN = "leyndell_ashen";
const BEFORE_ASHEN = realDatabase.region.map((row) => row.id).filter((id) => id !== ASHEN);

function inputs(changes: Partial<RunInputs> = {}): RunInputs {
  return {
    stats: MAXED,
    settings: defaultSettings(realDatabase),
    regions: BEFORE_ASHEN,
    weaponShortlist: [],
    deadBosses: [],
    ...changes,
  };
}

function start(changes: Partial<RunInputs> = {}, seed = 7): Run {
  const result = startRun(engine, inputs(changes), seed);
  if (!result.ok) throw new Error(result.problems.join(", "));
  return result.run;
}

function current(run: Run) {
  if (run.current === null) throw new Error("no current objective");
  return run.current;
}

describe("startRun", () => {
  it("names every problem and starts nothing", () => {
    const settings = { ...defaultSettings(realDatabase), characterClasses: [] };
    expect(startRun(engine, inputs({ regions: [], settings }), 1)).toEqual({
      ok: false,
      problems: ["Select at least one class", "Select at least one region"],
    });
  });

  it("refuses a character below level 1", () => {
    const stats = Object.fromEntries(STATS.map((stat) => [stat, 1])) as Stats;
    expect(startRun(engine, inputs({ stats }), 1)).toEqual({
      ok: false,
      problems: ["Raise your stats to level 1 or above"],
    });
  });

  it("refuses a run when the selected regions' bosses are all dead already", () => {
    const inLimgrave = new Set(
      realDatabase.location.filter((row) => row.region_id === "limgrave").map((row) => row.id),
    );
    const limgrave = realDatabase.boss_instance
      .filter((row) => row.odds > 0 && inLimgrave.has(row.location_id))
      .map((row) => row.id);
    const result = startRun(engine, inputs({ regions: ["limgrave"], deadBosses: limgrave }), 1);
    expect(result.ok).toBe(false);
  });

  it("rolls objective 1, with its boss from the selected regions", () => {
    const run = start({ regions: ["limgrave"] });
    const boss = engine.data.bosses.get(current(run).boss);
    const location = realDatabase.location.find((row) => row.id === boss?.location_id);
    expect(location?.region_id).toBe("limgrave");
  });

  it("is plain data, so it survives a JSON round trip unchanged", () => {
    const run = done(engine, start());
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});

describe("a whole run, one Done per boss", () => {
  it("meets every boss once, waits at the Ashen Capital, then finishes", () => {
    let run = start();
    while (run.current !== null) run = done(engine, run);
    expect(run.waiting).toBe("regions_cleared");
    expect(run.finished).toBe(false);

    run = rollNext(engine, editRun(run, { regions: [...BEFORE_ASHEN, ASHEN] }));
    while (run.current !== null) run = done(engine, run);

    const bosses = run.completed.map((row) => row.boss);
    expect(new Set(bosses).size).toBe(bosses.length);
    const inRoyalCapital = new Set(
      realDatabase.location
        .filter((row) => row.region_id === "leyndell" && !row.id.startsWith("sewer"))
        .map((row) => row.id),
    );
    const missed = realDatabase.boss_instance.filter((row) => row.odds > 0 && !bosses.includes(row.id));
    for (const boss of missed) expect(inRoyalCapital.has(boss.location_id)).toBe(true);
    expect(bosses.length + missed.length).toBe(218);
    expect(run.finished).toBe(true);
    expect(run.completed.every((row) => row.rerolls.length === 0)).toBe(true);
  });

  it("gives the same run for the same seed and actions", () => {
    const play = (seed: number) => {
      let run = start({}, seed);
      for (let step = 0; step < 20; step += 1) {
        run = step % 3 === 0 ? reroll(engine, run, "lh") : done(engine, run);
      }
      return run;
    };
    expect(play(11)).toEqual(play(11));
    expect(play(11)).not.toEqual(play(12));
  });
});

describe("Done", () => {
  it("marks the boss dead at its objective, records the snapshot and remembers what was seen", () => {
    const run = start();
    const objective = current(run);
    const next = done(engine, run);
    expect(next.deadBosses).toEqual([{ instanceId: objective.boss, objectiveIndex: 1 }]);
    expect(next.completed[0]).toMatchObject({ boss: objective.boss, stats: MAXED, level: 713 });
    expect(next.seen[`character_class:${objective.characterClass}`]).toBe(1);
    expect(next.seen[`rule:${objective.slots.rule_1}`]).toBe(1);
    expect(next.seen[`armor_set:${objective.slots.armor}`]).toBe(1);
    expect(current(next).boss).not.toBe(objective.boss);
  });

  it("remembers the hands too, so weapons and shields decay like everything else", () => {
    const run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } });
    const { rh, lh } = current(run).slots;
    const next = done(engine, run);
    expect(next.seen[`item:${rh}`]).toBe(1);
    expect(next.seen[`item:${lh}`]).toBe(1);
  });

  it("counts each completed objective once, even when none fills several of its slots", () => {
    let run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["warrior_2h"] } });
    run = done(engine, done(engine, done(engine, run)));
    expect(run.seen["character_class:warrior_2h"]).toBe(3);
    expect(run.seen["item:none"]).toBe(3);
  });
});

describe("decay", () => {
  it("multiplies again for each completed objective that showed an option", () => {
    const context = {
      data: engine.data,
      counted: new Set<string>(),
      state: { characterClass: "knight", boss: null, rolled: new Map() },
    };
    const options = slotOptions(engine.data, "knight", "rule_1");
    const weigh = (seen: Record<string, number>) =>
      weighOptions({ ...context, repetition: { seen, decay: 0.8 } }, options);
    const weight = (result: ReturnType<typeof weigh>, id: string) =>
      result.options.find((row) => row.option.row.id === id)?.weight ?? 0;

    const fresh = weigh({});
    expect(weight(weigh({ "rule:no_armor": 1 }), "no_armor")).toBeCloseTo(0.8 * weight(fresh, "no_armor"));
    expect(weight(weigh({ "rule:no_armor": 3 }), "no_armor")).toBeCloseTo(0.512 * weight(fresh, "no_armor"));
    expect(weight(weigh({ "rule:no_armor": 3 }), "no_rolling")).toBe(weight(fresh, "no_rolling"));
    expect(weighOptions({ ...context, repetition: NO_REPETITION }, options)).toEqual(fresh);
  });
});

describe("aliases", () => {
  const sorcerer = { settings: { ...defaultSettings(realDatabase), characterClasses: ["sorcerer"] } };
  const staves = realDatabase.item.filter((row) => row.alias === "any_staff").map((row) => row.id);

  it("counts a shown member as its alias, so every member repeats", () => {
    const run = done(engine, start(sorcerer));
    expect(run.seen["alias:any_staff"]).toBe(1);
    const context = {
      data: engine.data,
      counted: new Set(staves),
      state: { characterClass: "sorcerer", boss: null, rolled: new Map() },
    };
    const options = slotOptions(engine.data, "sorcerer", "rh");
    const weigh = (seen: Record<string, number>) =>
      weighOptions({ ...context, repetition: { seen, decay: 0.8 } }, options).options;
    const fresh = weigh({});
    const decayed = weigh({ "alias:any_staff": 1 });
    for (const row of fresh) {
      const after = decayed.find((one) => one.option.row.id === row.option.row.id);
      expect(after?.weight).toBeCloseTo(row.weight * 0.8);
    }
  });

  it("lets Never roll take out one member while the others still roll", () => {
    let run = start({ ...sorcerer, neverRoll: ["item:meteorite_staff"] });
    const rolled = new Set<string>();
    for (let step = 0; step < 30 && run.current !== null; step += 1) {
      const rh = current(run).slots.rh;
      if (typeof rh === "string") rolled.add(rh);
      run = done(engine, run);
    }
    expect(rolled.has("meteorite_staff")).toBe(false);
    expect([...rolled].every((id) => staves.includes(id))).toBe(true);
    expect(rolled.size).toBeGreaterThan(1);
  });
});

describe("rerolls", () => {
  const knight = { settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } };

  it("keeps the slots before the target and changes the target", () => {
    let run = start(knight);
    for (let step = 0; step < 10; step += 1) {
      const before = current(run);
      run = reroll(engine, run, "lh");
      const after = current(run);
      expect(after.slots.rh).toBe(before.slots.rh);
      expect(after.slots.rh_ash).toBe(before.slots.rh_ash);
      expect(after.slots.lh).not.toBe(before.slots.lh);
      expect(after.boss).toBe(before.boss);
    }
    expect(current(run).rerolls).toHaveLength(10);
  });

  it("rerolls only the armor when the armor is the target", () => {
    const run = start(knight);
    const before = current(run);
    const after = current(reroll(engine, run, "armor"));
    const { armor: oldArmor, ...rest } = before.slots;
    const { armor: newArmor, ...restAfter } = after.slots;
    expect(restAfter).toEqual(rest);
    expect(newArmor).not.toBe(oldArmor);
  });

  it("rerolls the armor with any slot before it", () => {
    const run = start(knight);
    const after = current(reroll(engine, run, "rule_2"));
    expect(after.trace.at(-1)?.slot).toBe("armor");
    expect(after.trace.filter((block) => block.slot === "armor")).toHaveLength(1);
  });

  it("gives the same result back when it's the only option", () => {
    const run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["warrior_2h"] } });
    expect(current(reroll(engine, run, "lh")).slots.lh).toBe("none");
  });

  it("changes the boss on Reroll objective, and the class on Reroll items", () => {
    const run = start();
    const objective = current(run);
    expect(current(reroll(engine, run, "boss")).boss).not.toBe(objective.boss);
    const items = current(reroll(engine, run, "character_class"));
    expect(items.boss).toBe(objective.boss);
    expect(items.characterClass).not.toBe(objective.characterClass);
  });

  it("counts every reroll until Done, then starts again", () => {
    let run = start();
    run = reroll(engine, run, "boss");
    run = reroll(engine, run, "character_class");
    run = reroll(engine, run, "rule_2");
    expect(current(run).rerolls).toEqual(["boss", "character_class", "rule_2"]);
    run = done(engine, run);
    expect(run.completed[0]?.rerolls).toHaveLength(3);
    expect(current(run).rerolls).toEqual([]);
  });
});

describe("Already dead and Finish run", () => {
  it("swaps the boss, keeps the loadout and marks the old boss dead", () => {
    const run = start();
    const objective = current(run);
    const next = alreadyDead(engine, run);
    expect(current(next).boss).not.toBe(objective.boss);
    expect(current(next).slots).toEqual(objective.slots);
    expect(next.deadBosses).toEqual([{ instanceId: objective.boss, objectiveIndex: 1 }]);
    expect(next.completed).toHaveLength(0);
  });

  it("discards the current objective", () => {
    const run = finishRun(start());
    expect(run.finished).toBe(true);
    expect(run.current).toBeNull();
    expect(run.completed).toHaveLength(0);
  });
});

describe("Weapon shortlist", () => {
  // Level 1, too weak for the listed weapon
  const weak = { ...DEFAULT_STATS, vig: 28, str: 1, dex: 1 };
  const settings = { ...defaultSettings(realDatabase), characterClasses: ["knight"], weaponShortlistEnabled: true };

  it("rolls a listed weapon, whatever the region, boss status and stats", () => {
    const run = start({
      settings,
      stats: weak,
      regions: ["limgrave"],
      weaponShortlist: ["morgotts_cursed_sword"],
    });
    expect(current(run).slots.rh).toBe("morgotts_cursed_sword");
    expect(current(run).shortlistRh).toBe(true);
  });

  it("falls back to the usual pool when the class can't use a listed weapon", () => {
    const run = start({ settings, weaponShortlist: ["longbow"] });
    expect(current(run).slots.rh).not.toBe("longbow");
    expect(current(run).shortlistRh).toBe(false);
  });

  it("does nothing while the checkbox is off", () => {
    const run = start({
      settings: { ...settings, weaponShortlistEnabled: false },
      stats: weak,
      regions: ["limgrave"],
      weaponShortlist: ["morgotts_cursed_sword"],
    });
    expect(current(run).slots.rh).not.toBe("morgotts_cursed_sword");
  });

  it("lets a reroll of RH move on to the usual pool when the one listed weapon is excluded", () => {
    const run = start({ settings, weaponShortlist: ["uchigatana"] });
    const next = current(reroll(engine, run, "rh"));
    expect(next.slots.rh).not.toBe("uchigatana");
    expect(next.shortlistRh).toBe(false);
  });

  it("decays a used listed weapon against the others on the list", () => {
    const listed = ["uchigatana", "longsword"];
    let run = start({ settings, weaponShortlist: listed });
    const first = current(run).slots.rh;
    run = done(engine, run);
    expect(run.seen[`item:${first}`]).toBe(1);
    expect(listed).toContain(current(run).slots.rh);
  });

  it("lets none join Jester's first pool without counting as a listed weapon", () => {
    const jester = { ...settings, characterClasses: ["jester"] };
    for (let seed = 1; seed <= 20; seed += 1) {
      const run = start({ settings: jester, weaponShortlist: ["briar_greatshield"] }, seed);
      expect(["briar_greatshield", "none"]).toContain(current(run).slots.rh);
    }
  });
});

describe("the Bosses list", () => {
  it("skips a boss without unlocking its items, and marks one dead to unlock them", () => {
    const settings = { ...defaultSettings(realDatabase), characterClasses: ["warrior_2h"] };
    const morgott = realDatabase.item_location.find(
      (row) => row.item_id === "morgotts_cursed_sword" && row.boss_instance_id !== null,
    )?.boss_instance_id as string;
    let run = start({ settings, regions: ["leyndell"] });
    run = setBossState(engine, run, morgott, "skipped");
    expect(bossStatus(run, morgott).state).toBe("skipped");
    for (let step = 0; step < 6 && run.current !== null; step += 1) {
      expect(current(run).boss).not.toBe(morgott);
      run = done(engine, run);
    }

    const bossLocked = (one: Run) => {
      const text = current(one).trace.find((block) => block.slot === "rh")?.text ?? "";
      return Number(/boss still alive: -(\d+)/.exec(text)?.[1] ?? 0);
    };
    const before = reroll(engine, start({ settings }), "rh");
    const skipped = reroll(engine, setBossState(engine, before, morgott, "skipped"), "rh");
    const dead = reroll(engine, setBossState(engine, before, morgott, "dead"), "rh");
    expect(bossLocked(skipped)).toBe(bossLocked(before));
    expect(bossLocked(dead)).toBeLessThan(bossLocked(before));
  });

  it("locks bosses killed by Done and the current boss, and lets the rest change", () => {
    let run = done(engine, start());
    const killed = run.completed[0]?.boss as string;
    const now = current(run).boss;
    expect(setBossState(engine, run, killed, "alive")).toBe(run);
    expect(setBossState(engine, run, now, "dead")).toBe(run);

    const other = realDatabase.boss_instance.find(
      (row) => row.odds > 0 && row.id !== killed && row.id !== now,
    )?.id as string;
    run = setBossState(engine, run, other, "dead");
    expect(run.deadBosses.at(-1)).toEqual({ instanceId: other, objectiveIndex: 2 });
    run = setBossState(engine, run, other, "alive");
    expect(bossStatus(run, other)).toEqual({ state: "alive", locked: false });
  });

  it("finishes once every boss is dead or skipped", () => {
    let run = start({ regions: ["limgrave"] });
    for (const row of realDatabase.boss_instance) {
      if (row.odds > 0 && row.id !== current(run).boss) run = setBossState(engine, run, row.id, "skipped");
    }
    run = done(engine, run);
    expect(run.finished).toBe(true);
  });
});

describe("armor", () => {
  it("rolls only sets whose every piece is in reach, and traces why the others are out", () => {
    const run = start({ regions: ["limgrave"] });
    const armor = current(run).trace.find((block) => block.slot === "armor")?.text ?? "";
    expect(armor).toMatch(/^Armor: /);
    expect(armor).toMatch(/not in region: -\d+/);
    expect(armor).toMatch(/boss still alive: -\d+/);
  });
});

describe("Never roll", () => {
  it("keeps an excluded item and rule from ever rolling, even from the weapon shortlist", () => {
    const settings = { ...defaultSettings(realDatabase), characterClasses: ["knight"], weaponShortlistEnabled: true };
    let run = start({
      settings,
      weaponShortlist: ["uchigatana"],
      neverRoll: ["item:uchigatana", "rule:none"],
    });
    for (let step = 0; step < 25; step += 1) {
      expect(current(run).slots.rh).not.toBe("uchigatana");
      expect(current(run).slots.rule_1).not.toBe("none");
      expect(current(run).slots.rule_2).not.toBe("none");
      run = done(engine, run);
    }
    const rh = current(run).trace.find((block) => block.slot === "rh")?.text ?? "";
    expect(rh).toMatch(/never roll: -1/);
  });
});
