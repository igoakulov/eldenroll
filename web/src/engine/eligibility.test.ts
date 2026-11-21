import { describe, expect, it } from "vitest";

import type { BossInstance, ItemLocation } from "./database";
import { countedItems, isSetReachable, rowCounts } from "./eligibility";
import { indexDatabase } from "./engineData";
import { realDatabase } from "./realDatabase.testing";

function boss(id: string, odds = 1): [string, BossInstance] {
  return [id, { id, name: id, location_id: "tile", location: "Tile", odds, url: null }];
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

describe("rowCounts follows the eligibility table", () => {
  it.each([
    ["pickup, region selected", located("spot"), HERE, true],
    ["pickup, region not selected", located("spot"), NOWHERE, false],
    ["alive boss, region selected", fromBoss("alive"), HERE, false],
    ["alive boss, region not selected", fromBoss("alive"), NOWHERE, false],
    ["dead boss, region selected", fromBoss("dead"), HERE, true],
    ["dead boss, region not selected", fromBoss("dead"), NOWHERE, true],
    ["boss at odds 0, region selected", fromBoss("zero"), HERE, true],
    ["boss at odds 0, region not selected", fromBoss("zero"), NOWHERE, false],
  ] as const)("%s", (_case, row, locations, counts) => {
    expect(rowCounts(row, BOSSES, { locations, deadBosses: DEAD })).toBe(counts);
  });
});

describe("countedItems", () => {
  it("counts an item with no location row everywhere, and others only from a row", () => {
    const data = indexDatabase(realDatabase);
    const counted = countedItems(data, { locations: NOWHERE, deadBosses: NOWHERE });
    const consumable = realDatabase.item.find((row) => row.category === "consumable")?.id;
    for (const id of [consumable, "none", "none_head"]) expect(counted.has(id ?? "")).toBe(true);
    expect(counted.has("uchigatana")).toBe(false);
  });
});

describe("isSetReachable", () => {
  it("counts a piece in an alias once any member is in reach", () => {
    const data = indexDatabase(realDatabase);
    const set = data.armorSets.get("perfume_jar")!;
    const rest = set.pieces.filter((piece) => data.items.get(piece)?.alias == null);
    const helm = set.pieces.find((piece) => data.items.get(piece)?.alias != null)!;
    const other = data.aliasMembers.get(data.items.get(helm)!.alias!)!.find((id) => id !== helm)!;
    expect(isSetReachable(data, set, new Set([...rest, other]))).toBe(true);
    expect(isSetReachable(data, set, new Set(rest))).toBe(false);
  });
});
