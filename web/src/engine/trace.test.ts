import { describe, expect, it } from "vitest";

import { indexDatabase } from "./engineData";
import { DEFAULT_HYPERPARAMS } from "./hyperparams";
import { realDatabase } from "./realDatabase.testing";
import { done, reroll, startRun, type Engine, type Run, type RunInputs } from "./run";
import { DEFAULT_STATS, defaultSettings } from "./settings";
import { formatMultiplier, formatProbability, formatTrace } from "./trace";

const engine: Engine = { data: indexDatabase(realDatabase), hyperparams: DEFAULT_HYPERPARAMS };

function start(changes: Partial<RunInputs> = {}, seed = 3): Run {
  const result = startRun(
    engine,
    {
      stats: DEFAULT_STATS,
      settings: defaultSettings(realDatabase),
      regions: ["limgrave"],
      weaponShortlist: [],
      deadBosses: [],
      ...changes,
    },
    seed,
  );
  if (!result.ok) throw new Error(result.problems.join(", "));
  return result.run;
}

function blocks(run: Run): string[] {
  return run.current?.trace.map((block) => block.text) ?? [];
}

describe("number formats", () => {
  it.each([
    [0, "x0"],
    [0.8, "x0.8"],
    [0.8 ** 5, "x0.33"],
    [0.8 ** 20, "x0.012"],
    [4, "x4"],
    [67, "x67"],
    [1_000_000, "x1000000"],
  ])("prints a multiplier of %s as %s", (value, text) => {
    expect(formatMultiplier(value)).toBe(text);
  });

  it.each([
    [1, "100%"],
    [0.148148, "14.8%"],
    [0.019, "1.9%"],
    [0.2, "20%"],
  ])("prints a probability of %s as %s", (value, text) => {
    expect(formatProbability(value)).toBe(text);
  });
});

describe("the trace of an objective", () => {
  it("has one block per rolled slot in rolling order, each ending in prob", () => {
    const run = start();
    const trace = run.current?.trace ?? [];
    expect(trace.map((block) => block.slot).slice(0, 3)).toEqual(["boss", "character_class", "rh"]);
    for (const text of blocks(run)) expect(text.split("\n").at(-1)).toMatch(/^ {2}prob: /);
  });

  it("shows what the player's inputs removed, under pool", () => {
    const rh = blocks(start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } })).find(
      (text) => text.startsWith("RH: "),
    );
    expect(rh).toMatch(
      /\n {2}pool: \d+\n {4}total pool: \d+\n {4}not in region: -\d+\n {4}boss still alive: -\d+\n {4}stat req: -\d+/,
    );
    const numbers = (rh ?? "").match(/-?\d+/g)?.map(Number) ?? [];
    const [pool = 0, total = 0, ...removed] = numbers.slice(0, 5);
    expect(total + removed.reduce((sum, value) => sum + value, 0)).toBe(pool);
  });

  it("marks a roll from the weapon shortlist and prints no removals for it", () => {
    const settings = { ...defaultSettings(realDatabase), characterClasses: ["knight"], weaponShortlistEnabled: true };
    const rh = blocks(start({ settings, weaponShortlist: ["uchigatana", "longsword"] })).find((text) =>
      text.startsWith("RH: "),
    );
    expect(rh).toContain("pool (shortlist): 2");
    expect(rh).not.toContain("not in region");
  });

  it("shows a modifier emptying a slot as a removal", () => {
    const run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } });
    const spell = blocks(run).find((text) => text.startsWith("Spell: "));
    expect(spell).toBe("Spell: none\n  pool: 0\n    total pool: 1\n    knight other rh keeps a shield in lh: -1\n  prob: 0%");
  });

  it("shows decay as a repeat line once something was seen", () => {
    let run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } });
    run = done(engine, done(engine, run));
    const characterClass = blocks(run).find((text) => text.startsWith("Class: "));
    expect(characterClass).toContain("  repeat: x0.8^2 = x0.64");
  });

  it("names the condition behind a modifier", () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed += 1) {
      const run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["jester"] } }, seed);
      found = blocks(run).some((text) => text === formatTrace([]) || text.includes("  Jester: x4"));
    }
    expect(found).toBe(true);
  });

  it("keeps the blocks before a rerolled slot and replaces the rest", () => {
    const run = start({ settings: { ...defaultSettings(realDatabase), characterClasses: ["knight"] } });
    const next = reroll(engine, run, "lh");
    const before = run.current?.trace ?? [];
    const after = next.current?.trace ?? [];
    expect(after.slice(0, 4)).toEqual(before.slice(0, 4));
    expect(after.map((block) => block.slot)).toEqual(before.map((block) => block.slot));
  });
});
