import { describe, expect, it } from "vitest";

import type { BossInstance, ItemLocation } from "./database";
import { countedItems, rowCounts } from "./eligibility";
import { indexDatabase } from "./engineData";
import { realDatabase } from "./realDatabase.testing";

function boss(id: string, odds = 1): [string, BossInstance] {
  return [id, { id, name: id, location_id: "tile", location: "Tile", odds }];
}

const BOSSES = new Map([boss("alive"), boss("dead"), boss("zero", 0)]);
const HERE = new Set(["tile", "spot"]);
const NOWHERE: ReadonlySet<string> = new Set();
const DEAD = new Set(["dead", "zero"]);

function located(id: string): ItemLocation {
  return { item_id: "i", location_id: id, boss_instance_id: null };
}

function fromBoss(id: string): ItemLocation {
  return { item_id: "i", location_id: null, boss_instance_id: id };
}

describe("rowCounts follows the prd.md table", () => {
  it.each([
    ["pickup, region selected", located("spot"), HERE, true, true],
    ["pickup, region not selected", located("spot"), NOWHERE, false, false],
    ["alive boss, region selected", fromBoss("alive"), HERE, false, true],
    ["alive boss, region not selected", fromBoss("alive"), NOWHERE, false, false],
    ["dead boss, region selected", fromBoss("dead"), HERE, true, true],
    ["dead boss, region not selected", fromBoss("dead"), NOWHERE, true, false],
    ["boss at odds 0, region selected", fromBoss("zero"), HERE, true, true],
    ["boss at odds 0, region not selected", fromBoss("zero"), NOWHERE, false, false],
  ] as const)("%s", (_case, row, locations, on, off) => {
    const reach = { locations, deadBosses: DEAD };
    expect(rowCounts(row, BOSSES, { ...reach, bossItemsOnlyFromDeadBosses: true })).toBe(on);
    expect(rowCounts(row, BOSSES, { ...reach, bossItemsOnlyFromDeadBosses: false })).toBe(off);
  });
});

describe("countedItems", () => {
  it("counts an item with no location row everywhere, and others only from a row", () => {
    const data = indexDatabase(realDatabase);
    const counted = countedItems(data, {
      locations: NOWHERE,
      deadBosses: NOWHERE,
      bossItemsOnlyFromDeadBosses: true,
    });
    const consumable = realDatabase.item.find((row) => row.category === "consumable")?.id;
    for (const id of [consumable, "none", "none_head"]) expect(counted.has(id ?? "")).toBe(true);
    expect(counted.has("uchigatana")).toBe(false);
  });
});
