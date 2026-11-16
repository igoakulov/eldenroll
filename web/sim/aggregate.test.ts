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

const database: Database = {
  region: ["r1", "r2", "r3"].map((id, index) => ({ id, name: id, region_level: index + 1 })),
  location: ["r1", "r2", "r3"].map((id) => ({ id: `in_${id}`, name: id, region_id: id })),
  boss_instance: [],
  item: [talisman("none"), ...Object.keys(PLACES).map(talisman)],
  armor_set: [],
  ash_compatibility: [],
  combat_rule: [],
  character_class: [{ id: "only", name: "Only", odds: 1 }],
  slot_pool: [{ character_class_id: "only", slot: "talisman_1", selectors: [{ kind: "category", ids: ["talisman"] }] }],
  alias: [],
  item_location: Object.entries(PLACES).map(([item, region]) => ({
    item_id: item,
    location_id: `in_${region}`,
    boss_instance_id: null,
  })),
  modifier: [],
};

/** One run whose objectives each show one talisman, `picks` over and over. The counting reads only the rolls, the
 * objectives' classes and what the pools offered, so the rest of a run is left out. */
function sample(picks: readonly string[], times: number): Sample {
  const shown = Array.from({ length: times }, () => picks).flat();
  const run = {
    objectives: shown.map((_, objective) => ({ objective, characterClass: "only" })),
    rolls: shown.map((chosen, objective) => ({ objective, slot: "talisman_1", chosen, chosenKey: `item:${chosen}` })),
    offered: new Map([["only", new Set(Object.keys(PLACES).map((id) => `item:${id}`))]]),
    reached: new Map([
      ["only", { options: new Set(Object.keys(PLACES).map((id) => `item:${id}`)), weaponAshes: new Set(), shieldAshes: new Set() }],
    ]),
  } as unknown as RunResult;
  return sampleOf(indexDatabase(database), [run], ["only"]);
}

describe("Vs fair", () => {
  it("reads 1 in every region when every talisman in reach shows equally, however many a region holds", () => {
    const shares = regionShares(sample(["a", "b", "c", "d"], 8), "talisman");
    expect(shares?.rows.map((row) => row.key).sort()).toEqual(["r1", "r2", "r3"]);
    for (const row of shares?.rows ?? []) expect(vsFair(row)).toBeCloseTo(1);
  });

  it("reads 2 for a region shown twice its fair share, and Furthest from fair lists it first", () => {
    const picked = sample(["a", "b", "c", "d", "d", "d"], 6);
    const byRegion = new Map(regionShares(picked, "talisman")?.rows.map((row) => [row.key, vsFair(row)]));
    expect(byRegion.get("r3")).toBeCloseTo(2);
    expect(byRegion.get("r1")).toBeCloseTo(2 / 3);
    expect(worstLines(fairLines(picked, ["talisman"]))[0]?.key).toBe("r3");
  });
});
