import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATS,
  STATS,
  correctedMaxStatGap,
  correctedStat,
  defaultSettings,
  derivedLevel,
  settingsProblems,
  type Stats,
} from "./settings";

const CHARACTER_CLASSES = {
  character_class: [
    { id: "knight", name: "Knight", odds: 1 },
    { id: "jester", name: "Jester", odds: 0.25 },
  ],
};
const SETTINGS = defaultSettings(CHARACTER_CLASSES);

function allStats(value: number): Stats {
  return Object.fromEntries(STATS.map((stat) => [stat, value])) as Stats;
}

describe("derivedLevel", () => {
  it("is the stat total minus 79", () => {
    const stats: Stats = { vig: 20, mind: 10, end: 15, str: 30, dex: 12, int: 9, fth: 8, arc: 7 };
    expect(derivedLevel(stats)).toBe(32);
  });

  it("shows an impossible level for impossible stats, without clamping", () => {
    expect(derivedLevel(allStats(8))).toBe(-15);
  });

  it("reaches 713 with every stat at 99", () => {
    expect(derivedLevel(allStats(99))).toBe(713);
  });

  it("starts at level 1 with the default stats", () => {
    expect(derivedLevel(DEFAULT_STATS)).toBe(1);
  });
});

describe("defaultSettings", () => {
  it("matches the defaults of the spec, with every class selected", () => {
    expect(SETTINGS).toEqual({
      maxStatGap: 10,
      characterClasses: ["knight", "jester"],
      weaponShortlistEnabled: false,
      bossItemsOnlyFromDeadBosses: true,
    });
  });
});

describe("correctedStat", () => {
  it.each([
    ["1", 1],
    ["50", 50],
    ["99", 99],
    ["007", 7],
    ["0", 1],
    ["100", 99],
    ["1000", 99],
  ])("turns %s into %s", (entered, corrected) => {
    expect(correctedStat(entered, 40)).toBe(corrected);
  });

  it.each(["", "12.5", "-5", "1e2", " 5", "abc"])("keeps the previous value for %j", (entered) => {
    expect(correctedStat(entered, 40)).toBe(40);
  });
});

describe("correctedMaxStatGap", () => {
  it.each([
    ["0", 0],
    ["10", 10],
    ["500", 500],
  ])("turns %s into %s", (entered, corrected) => {
    expect(correctedMaxStatGap(entered, 10)).toBe(corrected);
  });

  it.each(["", "2.5", "-1"])("keeps the previous value for %j", (entered) => {
    expect(correctedMaxStatGap(entered, 10)).toBe(10);
  });
});

describe("settingsProblems", () => {
  it("accepts any selection of classes", () => {
    expect(settingsProblems(SETTINGS)).toEqual([]);
    expect(settingsProblems({ ...SETTINGS, characterClasses: ["jester"] })).toEqual([]);
  });

  it("asks for a class when none is selected", () => {
    expect(settingsProblems({ ...SETTINGS, characterClasses: [] })).toEqual(["Select at least one class"]);
  });
});
