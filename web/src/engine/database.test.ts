import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  POOL_SLOTS,
  SELECTOR_KINDS,
  type Condition,
  type Database,
  type Selector,
} from "./database";
import { realDatabase as database } from "./realDatabase.testing";

// Record<keyof ...> makes the compiler fail when a type gains a field this list lacks, and the
// test fails when a row holds a field the list lacks, so the types can't drift from db.json.
const FIELDS: { readonly [T in keyof Database]: Record<keyof Database[T][number], true> } = {
  region: { id: true, name: true, region_level: true },
  location: { id: true, name: true, region_id: true },
  boss_instance: { id: true, name: true, location_id: true, location_label: true, odds: true },
  item: {
    id: true,
    name: true,
    category: true,
    subcategory: true,
    infusable: true,
    str_bonus_2h: true,
    alias: true,
    image: true,
    str: true,
    dex: true,
    int: true,
    fth: true,
    arc: true,
    odds: true,
  },
  armor_set: { id: true, name: true, pieces: true, odds: true },
  ash_compatibility: { ash_id: true, category: true, subcategory: true },
  combat_rule: { id: true, name: true, odds: true },
  build: { id: true, name: true, odds: true },
  slot_pool: { build_id: true, slot: true, selectors: true },
  alias: { id: true, label: true },
  item_location: { item_id: true, location_id: true, boss_instance_id: true },
  modifier: { id: true, when: true, target: true, value: true },
};

function rolledConditions(): Extract<Condition, { kind: "rolled" }>[] {
  return database.modifier.flatMap((row) =>
    row.when.filter((one): one is Extract<Condition, { kind: "rolled" }> => one.kind === "rolled"),
  );
}

function allSelectors(): Selector[] {
  return [
    ...database.slot_pool.flatMap((row) => row.selectors),
    ...database.modifier.map((row) => row.target),
    ...rolledConditions().map((one) => one.selector),
  ];
}

describe("db.json", () => {
  it("holds the expected row counts", () => {
    expect(database.region).toHaveLength(17);
    expect(database.location).toHaveLength(174);
    expect(database.boss_instance).toHaveLength(229);
    expect(database.boss_instance.filter((row) => row.odds > 0)).toHaveLength(218);
    expect(database.item).toHaveLength(1522);
    expect(database.item.filter((row) => row.category === "none")).toHaveLength(1);
    expect(database.build).toHaveLength(8);
    expect(database.slot_pool).toHaveLength(72);
    expect(database.combat_rule).toHaveLength(28);
    expect(database.alias).toHaveLength(11);
  });

  it("has exactly the tables and fields of the types", () => {
    expect(Object.keys(database).sort()).toEqual(Object.keys(FIELDS).sort());
    for (const [table, fields] of Object.entries(FIELDS)) {
      const rows = database[table as keyof Database] as readonly object[];
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(Object.keys(fields).sort());
      }
    }
  });

  it("uses only the vocabulary of the types", () => {
    const categories: readonly string[] = CATEGORIES;
    const kinds: readonly string[] = SELECTOR_KINDS;
    const slots: readonly string[] = POOL_SLOTS;

    for (const row of database.item) expect(categories).toContain(row.category);
    for (const row of database.ash_compatibility) expect(categories).toContain(row.category);
    for (const row of database.slot_pool) expect(slots).toContain(row.slot);
    for (const one of allSelectors()) expect(kinds).toContain(one.kind);
    for (const one of rolledConditions()) expect([...slots, "boss"]).toContain(one.slot);
  });
});
