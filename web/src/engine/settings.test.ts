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

const BUILDS = {
  build: [
    { id: "knight", name: "Knight", odds: 1 },
    { id: "jester", name: "Jester", odds: 0.25 },
  ],
};
const SETTINGS = defaultSettings(BUILDS);

function allStats(value: number): Stats {
  return Object.fromEntries(STATS.map((stat) => [stat, value])) as Stats;
}

describe("derivedLevel", () => {
  it("is the stat total minus 79", () => {
    const stats: Stats = { vig: 20, mind: 10, end: 15, str: 30, dex: 12, int: 9, fth: 8, arc: 7 };
    expect(derivedLevel(stats)).toBe(32);
  });

  it("never drops below 1", () => {
    expect(derivedLevel(allStats(1))).toBe(1);
  });

  it("reaches 713 with every stat at 99", () => {
    expect(derivedLevel(allStats(99))).toBe(713);
  });

  it("starts at level 1 with the default stats", () => {
    expect(derivedLevel(DEFAULT_STATS)).toBe(1);
  });
});

describe("defaultSettings", () => {
  it("matches the defaults of the spec, with every build selected", () => {
    expect(SETTINGS).toEqual({
      maxStatGap: 10,
      builds: ["knight", "jester"],
      upgradedWeaponsEnabled: false,
      bossItemsOnlyFromDeadBosses: true,
    });
  });
});

describe("correctedStat", () => {
  it.each([
    [1, 1],
    [50, 50],
    [99, 99],
    [0, 1],
    [-5, 1],
    [100, 99],
    [1000, 99],
    [12.9, 12],
    [0.5, 1],
    [99.5, 99],
  ])("turns %s into %s", (entered, corrected) => {
    expect(correctedStat(entered, 40)).toBe(corrected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("keeps the previous value for %s", (entered) => {
    expect(correctedStat(entered, 40)).toBe(40);
  });
});

describe("correctedMaxStatGap", () => {
  it.each([
    [0, 0],
    [10, 10],
    [500, 500],
    [-1, 0],
    [2.5, 2],
  ])("turns %s into %s", (entered, corrected) => {
    expect(correctedMaxStatGap(entered, 10)).toBe(corrected);
  });

  it("keeps the previous value for a blank entry", () => {
    expect(correctedMaxStatGap(Number.NaN, 10)).toBe(10);
  });
});

describe("settingsProblems", () => {
  it("accepts any selection of builds", () => {
    expect(settingsProblems(SETTINGS)).toEqual([]);
    expect(settingsProblems({ ...SETTINGS, builds: ["jester"] })).toEqual([]);
  });

  it("asks for a build when none is selected", () => {
    expect(settingsProblems({ ...SETTINGS, builds: [] })).toEqual(["Select at least one build"]);
  });
});
