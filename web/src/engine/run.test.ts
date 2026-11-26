import { describe, expect, it } from "vitest";

import { copy } from "../copy";
import type { LoadoutSlot } from "./database";
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
import type { SlotRoll } from "./slotRoll";

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

function start(changes: Partial<RunInputs> = {}, seed = 7, using: Engine = engine): Run {
  const result = startRun(using, inputs(changes), seed);
  if (!result.ok) throw new Error(result.problems.join(", "));
  return result.run;
}

/** `Done`, then `Roll objective N` with nothing changed on `Level up`. */
function doneAndRoll(run: Run): Run {
  return rollNext(engine, done(engine, run));
}

/** Every slot roll an action makes, in order. */
function observed(action: (observing: Engine) => Run): [LoadoutSlot, SlotRoll][] {
  const rolls: [LoadoutSlot, SlotRoll][] = [];
  action({ ...engine, observe: (slot, roll) => rolls.push([slot, roll]) });
  return rolls;
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
      problems: [copy.notices.noClass, copy.notices.noRegion],
    });
  });

  it("refuses a character below level 1", () => {
    const stats = Object.fromEntries(STATS.map((stat) => [stat, 1])) as Stats;
    expect(startRun(engine, inputs({ stats }), 1)).toEqual({
      ok: false,
      problems: [copy.notices.lowLevel],
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

});

describe("a whole run, one Done per boss", () => {
  it("meets every boss once, waits at the Ashen Capital, then finishes", () => {
    let run = start();
    while (run.current !== null) run = doneAndRoll(run);
    expect(run.waiting).toBe("regions_cleared");
    expect(run.finished).toBe(false);

    run = rollNext(engine, editRun(run, { regions: [...BEFORE_ASHEN, ASHEN] }));
    while (run.current !== null) run = doneAndRoll(run);

    const bosses = run.completed.map((row) => row.boss);
    expect(new Set(bosses).size).toBe(bosses.length);
    const inRoyalCapital = new Set(
      realDatabase.location
        .filter((row) => row.region_id === "leyndell" && !row.id.startsWith("sewer"))
        .map((row) => row.id),
    );
    const missed = realDatabase.boss_instance.filter((row) => row.odds > 0 && !bosses.includes(row.id));
    for (const boss of missed) expect(inRoyalCapital.has(boss.location_id)).toBe(true);
    expect(bosses.length + missed.length).toBe(realDatabase.boss_instance.filter((row) => row.odds > 0).length);
    expect(run.finished).toBe(true);
    expect(run.completed.every((row) => row.rerolls.length === 0)).toBe(true);
  });

});

describe("Done", () => {
  it("marks the boss dead at its objective and records the snapshot", () => {
    const run = start();
    const objective = current(run);
    const next = done(engine, run);
    expect(next.deadBosses).toEqual([{ instanceId: objective.boss, objectiveIndex: 1 }]);
    expect(next.completed[0]).toMatchObject({ boss: objective.boss, stats: MAXED, level: 713 });
    expect(next.current).toBeNull();
    expect(current(rollNext(engine, next)).boss).not.toBe(objective.boss);
  });
});

describe("aliases", () => {
  const sorcerer = { settings: { ...defaultSettings(realDatabase), characterClasses: ["sorcerer"] } };
  const staves = realDatabase.item.filter((row) => row.alias === "any_staff").map((row) => row.id);

  it("lets Never roll take out one member while the others still roll", () => {
    let run = start({ ...sorcerer, neverRoll: ["item:meteorite_staff"] });
    const rolled = new Set<string>();
    for (let step = 0; step < 30 && run.current !== null; step += 1) {
      const rh = current(run).slots.rh;
      if (typeof rh === "string") rolled.add(rh);
      run = doneAndRoll(run);
    }
    expect(rolled.has("meteorite_staff")).toBe(false);
    expect([...rolled].filter((id) => staves.includes(id)).length).toBeGreaterThan(1);
  });
});

describe("catch-up", () => {
  const knight = { settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } };

  it("rolls everything at its odds on the first objective, when nothing has had any chance yet", () => {
    const rolls = observed((observing) => start({}, 7, observing));
    for (const [, roll] of rolls) for (const row of roll.options) expect(row.catchUp).toBeCloseTo(1);
  });

  it("favours a sword that comes into reach late over the ones in reach from the start", () => {
    let run = start({ ...knight, regions: ["limgrave"] });
    for (let step = 0; step < 10; step += 1) run = doneAndRoll(run);
    const rolls = observed((observing) => rollNext(observing, done(observing, editRun(run, { regions: ["limgrave", "haligtree"] }))));
    const rh = rolls.find(([slot]) => slot === "rh")?.[1];
    const late = rh?.options.find((row) => row.option.row.id === "miquellan_knights_sword");
    expect(late?.catchUp).toBeGreaterThan(1);
    // Arrivals as late tie with it; the margin absorbs rounding
    expect(rh?.options.every((row) => row.catchUp <= (late?.catchUp ?? 0) + 1e-9)).toBe(true);
  });

  it("counts an objective once however often its slots were rerolled", () => {
    // The `#left` entries hold when each option arrived, not chance
    const total = (tally: Readonly<Record<string, number>>) =>
      Object.entries(tally).reduce((sum, [key, value]) => (key.endsWith("#left") ? sum : sum + value), 0);
    let run = start(knight);
    const slots = Object.keys(current(run).slots).length;
    for (let step = 0; step < 5; step += 1) run = reroll(engine, run, "rh");
    // Each kept roll adds at most its whole chance, so discarded loadouts counted would add far more
    expect(total(done(engine, run).tally)).toBeLessThanOrEqual(slots + 1e-9);
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
    const slots = observed((observing) => reroll(observing, run, "rule")).map(([slot]) => slot);
    expect(slots).toEqual(["rule", "armor"]);
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
    run = reroll(engine, run, "rule");
    expect(current(run).rerolls).toEqual(["boss", "character_class", "rule"]);
    run = doneAndRoll(run);
    expect(run.completed[0]?.rerolls).toHaveLength(3);
    expect(current(run).rerolls).toEqual([]);
    expect(current(run).replaced).toEqual([]);
  });

  it("counts as replaced what the stop names, not the armor every reroll redoes", () => {
    let run = start(knight);
    const first = current(run);
    run = reroll(engine, run, "boss");
    expect(current(run).replaced).toEqual([first.boss]);
    const second = current(run);
    run = reroll(engine, run, "rh");
    const third = current(run);
    const hands = [second.slots.rh, ...(third.slots.lh === second.slots.lh ? [] : [second.slots.lh])];
    expect(third.replaced).toEqual([first.boss, ...hands]);
    expect(third.replaced).not.toContain(second.slots.armor);
    run = reroll(engine, run, "armor");
    expect(current(run).replaced).toEqual([...third.replaced, third.slots.armor]);
  });
});

describe("the second talisman slot", () => {
  const MARGIT = "margit_the_fell_omen_stormveil_castle";
  const talismans = (run: Run) => [current(run).slots.talisman_1, current(run).slots.talisman_2];

  it("stays closed while Margit may still be an objective, and opens once she is felled or out of the run", () => {
    expect(talismans(start({ regions: ["limgrave"] }))[1]).toBeUndefined();
    for (const opened of [{ deadBosses: [MARGIT] }, { skippedBosses: [MARGIT] }, { regions: ["liurnia"] }]) {
      const [first, second] = talismans(start({ regions: ["limgrave"], ...opened }));
      expect(first).toBeDefined();
      expect(second).toBeDefined();
    }
  });

  it("keeps one talisman through a reroll of the talismans while Margit lives", () => {
    const run = reroll(engine, start({ regions: ["limgrave"] }), "talisman_1");
    expect(talismans(run)[0]).toBeDefined();
    expect(talismans(run)[1]).toBeUndefined();
  });
});

describe("Already dead and Finish run", () => {
  it("marks the boss dead and rerolls the full objective without counting a reroll", () => {
    const run = reroll(engine, start(), "armor");
    const objective = current(run);
    const next = alreadyDead(engine, run);
    expect(current(next).boss).not.toBe(objective.boss);
    expect(current(next).rerolls).toEqual(["armor"]);
    expect(current(next).replaced).toEqual(objective.replaced);
    expect(next.deadBosses).toEqual([{ instanceId: objective.boss, objectiveIndex: 1 }]);
    expect(next.completed).toHaveLength(0);
  });

  it("waits, as Done does, when the marked boss was the last one in the regions", () => {
    const inLimgrave = new Set(
      realDatabase.location.filter((row) => row.region_id === "limgrave").map((row) => row.id),
    );
    const [last, ...others] = realDatabase.boss_instance
      .filter((row) => row.odds > 0 && inLimgrave.has(row.location_id))
      .map((row) => row.id);
    const run = start({ regions: ["limgrave"], deadBosses: others });
    expect(current(run).boss).toBe(last);
    const next = alreadyDead(engine, run);
    expect(next.current).toBeNull();
    expect(next.waiting).toBe("regions_cleared");
    expect(next.waiting).toBe(done(engine, run).waiting);
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

  it("lets none join Jester's first pool without counting as a listed weapon", () => {
    const jester = { ...settings, characterClasses: ["jester"] };
    for (let seed = 1; seed <= 20; seed += 1) {
      const run = start({ settings: jester, weaponShortlist: ["spiked_palisade_shield"] }, seed);
      expect(["spiked_palisade_shield", "none"]).toContain(current(run).slots.rh);
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
      run = doneAndRoll(run);
    }

    const rhPool = (one: Run) =>
      observed((observing) => reroll(observing, one, "rh")).find(([slot]) => slot === "rh")?.[1].pool ?? 0;
    const before = start({ settings });
    expect(rhPool(setBossState(engine, before, morgott, "skipped"))).toBe(rhPool(before));
    expect(rhPool(setBossState(engine, before, morgott, "dead"))).toBeGreaterThan(rhPool(before));
  });

  it("keeps gear shown on a done objective in reach after the Royal Capital falls away with Maliketh", () => {
    const settings = { ...defaultSettings(realDatabase), characterClasses: ["spellblade"] };
    const maliketh = "maliketh_the_black_blade_crumbling_farum_azula";
    const royal = realDatabase.item_location.find(
      (row) => row.item_id === "coded_sword" && row.location_id === "leyndell",
    );
    expect(royal).toBeDefined();
    const run = doneAndRoll(start({ settings }));
    const done1 = run.completed[0] as Run["completed"][number];
    const withSword: Run = { ...run, completed: [{ ...done1, slots: { ...done1.slots, rh: "coded_sword" } }] };
    const rhIds = (one: Run) =>
      observed((observing) => reroll(observing, setBossState(engine, one, maliketh, "dead"), "rh"))
        .find(([slot]) => slot === "rh")?.[1]
        .options.map((row) => row.option.row.id) ?? [];
    expect(rhIds(run)).not.toContain("coded_sword");
    expect(rhIds(withSword)).toContain("coded_sword");
  });

  it("locks bosses killed by Done and the current boss, and lets the rest change", () => {
    let run = doneAndRoll(start());
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
  it("rolls only sets whose every piece is in reach", () => {
    const rolls = observed((observing) => start({ regions: ["limgrave"] }, 7, observing));
    const armor = rolls.find(([slot]) => slot === "armor")?.[1];
    const rollable = realDatabase.armor_set.filter((row) => row.odds > 0).length;
    expect(armor?.pool).toBeGreaterThan(0);
    expect(armor?.pool).toBeLessThan(rollable);
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
      expect(current(run).slots.rule).not.toBe("none");
      run = doneAndRoll(run);
    }
  });
});
