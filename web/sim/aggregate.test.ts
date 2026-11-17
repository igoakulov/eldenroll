import { describe, expect, it } from "vitest";

import type { Database, Item } from "../src/engine/database";
import { indexDatabase } from "../src/engine/engineData";
import { fairLines, regionShares, sampleOf, vsFair, worstLines, type Sample } from "./aggregate";
import type { RunResult } from "./simulate";

function talisman(id: string): Item {
  return {
    id,
    name: id,
    category: id === "none" ? "none" : "talisman",
    subcategory: null,
    infusable: null,
    str_bonus_2h: null,
    alias: null,
    image: null,
    url: null,
    str: 0,
    dex: 0,
    int: 0,
    fth: 0,
    arc: 0,
    odds: 1,
  };
}

// Region r1 holds two of the four talismans, so its fair share is half; r2 and r3 hold a quarter each.
const PLACES = { a: "r1", b: "r1", c: "r2", d: "r3" } as const;

function database(classes: readonly string[]): Database {
  return {
    region: ["r1", "r2", "r3"].map((id, index) => ({ id, name: id, region_level: index + 1 })),
    location: ["r1", "r2", "r3"].map((id) => ({ id: `in_${id}`, name: id, region_id: id })),
    boss_instance: [],
    item: [talisman("none"), ...Object.keys(PLACES).map(talisman)],
    armor_set: [],
    ash_compatibility: [],
    combat_rule: [],
    character_class: classes.map((id) => ({ id, name: id, odds: 1 })),
    slot_pool: classes.map((id) => ({ character_class_id: id, slot: "talisman_1", selectors: [{ kind: "category", ids: ["talisman"] }] })),
    alias: [],
    item_location: Object.entries(PLACES).map(([item, region]) => ({
      item_id: item,
      location_id: `in_${region}`,
      boss_instance_id: null,
    })),
    modifier: [],
  };
}

/** One run whose objectives each show one talisman, `picks` over and over, for each class in turn. The counting reads
 * only the rolls, the objectives' classes and what the pools offered, so the rest of a run is left out. */
function sample(picks: readonly string[], times: number, classes: readonly string[] = ["only"]): Sample {
  const shown = classes.flatMap((characterClass) =>
    Array.from({ length: times }, () => picks).flat().map((chosen) => ({ characterClass, chosen })),
  );
  const everything = () => new Set(Object.keys(PLACES).map((id) => `item:${id}`));
  const run = {
    objectives: shown.map(({ characterClass }, objective) => ({ objective, characterClass })),
    rolls: shown.map(({ chosen }, objective) => ({ objective, slot: "talisman_1", chosen, chosenKey: `item:${chosen}` })),
    offered: new Map(classes.map((id) => [id, everything()])),
    reached: new Map(classes.map((id) => [id, { options: everything(), weaponAshes: new Set(), shieldAshes: new Set() }])),
    rollable: new Map(),
  } as unknown as RunResult;
  return sampleOf(indexDatabase(database(classes)), [run], classes);
}

describe("Vs fair", () => {
  it("reads 1 in every region when every talisman in reach shows equally, however many a region holds", () => {
    const shares = regionShares(sample(["a", "b", "c", "d"], 8), "talisman");
    expect(shares?.rows.map((row) => row.key).sort()).toEqual(["r1", "r2", "r3"]);
    for (const row of shares?.rows ?? []) expect(vsFair(row)).toBeCloseTo(1);
  });

  it("reads 2 for a region shown twice its fair share", () => {
    const byRegion = new Map(regionShares(sample(["a", "b", "c", "d", "d", "d"], 6), "talisman")?.rows.map((row) => [row.key, vsFair(row)]));
    expect(byRegion.get("r3")).toBeCloseTo(2);
    expect(byRegion.get("r1")).toBeCloseTo(2 / 3);
  });
});

describe("Furthest from fair", () => {
  const skewed = ["a", "b", "c", "d", "d", "d"];

  it("lists a region twice its fair share once the sample rules out luck, first as the largest gap", () => {
    const picked = sample(skewed, 12);
    expect(worstLines(fairLines(picked, ["talisman"]), 1)[0]?.key).toBe("r3");
  });

  it("lists nothing when the same skew rests on too few showings to tell from luck", () => {
    const picked = sample(skewed, 1);
    expect(worstLines(fairLines(picked, ["talisman"]), 1)).toEqual([]);
  });

  it("sums a shortfall classes share when no class is off by enough alone", () => {
    const picked = sample(["a", "b", "c", "d", "d"], 15, ["x", "y"]);
    const lines = fairLines(picked, ["talisman"]);
    expect(worstLines(lines.filter((line) => line.classes[0] === "x"), 1)).toEqual([]);
    const worst = worstLines(lines, 1);
    expect(worst.map((line) => [line.key, [...line.classes].sort()])).toEqual([["r3", ["x", "y"]]]);
  });
});
