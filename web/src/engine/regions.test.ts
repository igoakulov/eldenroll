import { describe, expect, it } from "vitest";

import type { BossInstance, Database } from "./database";
import { realDatabase as database } from "./realDatabase.testing";
import { DEFAULT_REGIONS, bossPool, selectedLocations } from "./regions";

const NO_DEAD: ReadonlySet<string> = new Set();
const ROYAL = "leyndell";
const ASHEN = "leyndell_ashen";
const SHUNNING_GROUNDS = ["sewer", "sewer_flame", "sewer_catacombs"];

function regionOf(boss: BossInstance): string {
  const location = database.location.find((row) => row.id === boss.location_id);
  if (location === undefined) throw new Error(`${boss.id} has no location`);
  return location.region_id;
}

function bossIds(regions: readonly string[], dead: ReadonlySet<string> = NO_DEAD): string[] {
  const pool = bossPool(database, new Set(regions), dead);
  return pool.status === "ready" ? pool.bosses.map((row) => row.id) : [];
}

function fixture(bosses: readonly Pick<BossInstance, "id" | "odds">[]): Pick<
  Database,
  "location" | "boss_instance"
> {
  return {
    location: [{ id: "here", name: "Here", region_id: "region" }],
    boss_instance: bosses.map((row) => ({
      ...row,
      name: row.id,
      location_id: "here",
      location: "Here",
    })),
  };
}

describe("regions", () => {
  it("are stored in ascending region_level, which is the display order", () => {
    const levels = database.region.map((row) => row.region_level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("default to the first region only", () => {
    expect(DEFAULT_REGIONS).toEqual([database.region[0]?.id]);
  });
});

describe("selectedLocations", () => {
  it("holds exactly a selected region's locations", () => {
    const expected = database.location.filter((row) => row.region_id === "caelid").map((row) => row.id);
    expect([...selectedLocations(database, new Set(["caelid"]))].sort()).toEqual(expected.sort());
  });

  it("is empty with no region", () => {
    expect(selectedLocations(database, new Set()).size).toBe(0);
  });

  it("drops the Royal Capital for the Ashen one, but keeps the Shunning-Grounds", () => {
    const ashen = selectedLocations(database, new Set([ASHEN]));
    for (const location of SHUNNING_GROUNDS) expect(ashen.has(location)).toBe(true);
    expect(ashen.has("leyndell")).toBe(false);
    expect(ashen.has("leyndell2")).toBe(true);
    expect([...selectedLocations(database, new Set([ROYAL, ASHEN]))].sort()).toEqual([...ashen].sort());
  });

  it("drops the Royal Capital once Maliketh is dead, without adding the Ashen one", () => {
    const dead = new Set(["maliketh_the_black_blade_crumbling_farum_azula"]);
    const royal = selectedLocations(database, new Set([ROYAL]), dead);
    expect(royal.has("leyndell")).toBe(false);
    expect(royal.has("leyndell2")).toBe(false);
    for (const location of SHUNNING_GROUNDS) expect(royal.has(location)).toBe(true);
  });

  it("keeps the whole Royal Capital while the Ashen one is not selected", () => {
    const royal = selectedLocations(database, new Set([ROYAL]));
    expect(royal.has("leyndell")).toBe(true);
    for (const location of SHUNNING_GROUNDS) expect(royal.has(location)).toBe(true);
    expect(royal.has("leyndell2")).toBe(false);
  });
});

describe("bossPool", () => {
  it("holds only the selected regions' rollable bosses, in table order", () => {
    const expected = database.boss_instance
      .filter((row) => row.odds > 0 && regionOf(row) === "limgrave")
      .map((row) => row.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(bossIds(["limgrave"])).toEqual(expected);
  });

  it("counts every rollable boss once across the regions", () => {
    const all = database.region.map((row) => row.id).filter((id) => id !== ASHEN);
    expect(bossIds(all)).toHaveLength(218 - bossesOnlyInTheAshenCapital());
  });

  function bossesOnlyInTheAshenCapital(): number {
    return database.boss_instance.filter((row) => row.odds > 0 && regionOf(row) === ASHEN).length;
  }

  it("never holds a boss at odds 0", () => {
    const zero = database.boss_instance.filter((row) => row.odds === 0).map((row) => row.id);
    expect(zero).toHaveLength(11);
    const all = bossIds(database.region.map((row) => row.id));
    for (const id of zero) expect(all).not.toContain(id);
  });

  it("gives the Ashen Capital the Shunning-Grounds bosses and none of the Royal Capital's", () => {
    const ashen = database.boss_instance
      .filter((row) => bossIds([ASHEN]).includes(row.id))
      .map((row) => row.name);
    expect(ashen).toContain("Mohg, the Omen");
    expect(ashen).toContain("Esgar, Priest of Blood");
    expect(ashen).not.toContain("Morgott, the Omen King");
    expect(bossIds([ROYAL, ASHEN])).toEqual(bossIds([ASHEN]));
  });

  it("removes one dead instance, not the boss identity", () => {
    const pool = database.boss_instance.filter((row) => row.odds > 0);
    const twin = pool.find((one) => pool.some((two) => two !== one && two.name === one.name));
    if (twin === undefined) throw new Error("no boss has two instances");
    const other = pool.find((row) => row.name === twin.name && row.id !== twin.id);
    if (other === undefined) throw new Error("no second instance");

    const regions = database.region.map((row) => row.id).filter((id) => id !== ASHEN);
    const left = bossIds(regions, new Set([twin.id]));
    expect(left).not.toContain(twin.id);
    expect(left).toContain(other.id);
  });

  it("reports no region before anything else", () => {
    expect(bossPool(database, new Set(), NO_DEAD)).toEqual({ status: "no_region" });
  });

  it("reports no bosses when the selection holds none that can roll", () => {
    const data = fixture([{ id: "off", odds: 0 }]);
    expect(bossPool(data, new Set(["region"]), NO_DEAD)).toEqual({ status: "no_bosses" });
    expect(bossPool(data, new Set(["region"]), new Set(["off"]))).toEqual({ status: "no_bosses" });
  });

  it("reports all dead only when every boss that can roll is dead, whatever sits at odds 0", () => {
    const data = fixture([
      { id: "alive", odds: 1 },
      { id: "off", odds: 0 },
    ]);
    expect(bossPool(data, new Set(["region"]), new Set(["alive"]))).toEqual({ status: "all_dead" });
  });

  it("asks for more regions, and doesn't finish, while a boss lives elsewhere", () => {
    const limgrave = database.boss_instance
      .filter((row) => row.odds > 0 && regionOf(row) === "limgrave")
      .map((row) => row.id);
    expect(bossPool(database, new Set(["limgrave"]), new Set(limgrave))).toEqual({
      status: "regions_cleared",
    });
  });

  it("stops waiting on the Royal Capital's bosses once Maliketh is dead, and not before", () => {
    const royalOnly = database.boss_instance
      .filter(
        (row) =>
          row.odds > 0 && regionOf(row) === ROYAL && !SHUNNING_GROUNDS.includes(row.location_id),
      )
      .map((row) => row.id);
    expect(royalOnly.length).toBeGreaterThan(0);
    const othersDead = new Set(
      database.boss_instance
        .filter((row) => row.odds > 0 && !royalOnly.includes(row.id))
        .map((row) => row.id),
    );
    expect(othersDead.has("maliketh_the_black_blade_crumbling_farum_azula")).toBe(true);
    expect(bossPool(database, new Set([ASHEN]), othersDead)).toEqual({ status: "all_dead" });

    const malikethAlive = new Set(othersDead);
    malikethAlive.delete("maliketh_the_black_blade_crumbling_farum_azula");
    expect(bossPool(database, new Set([ASHEN]), malikethAlive).status).not.toBe("all_dead");
  });

  it("finishes once every boss in the game is dead, with any selection", () => {
    const dead = new Set(database.boss_instance.filter((row) => row.odds > 0).map((row) => row.id));
    expect(bossPool(database, new Set(["limgrave"]), dead)).toEqual({ status: "all_dead" });
    expect(bossPool(database, new Set(), dead)).toEqual({ status: "all_dead" });
  });

  it("ignores a dead boss outside the selection", () => {
    const outside = database.boss_instance.find(
      (row) => row.odds > 0 && regionOf(row) === "caelid",
    );
    if (outside === undefined) throw new Error("no boss in Caelid");
    expect(bossIds(["limgrave"], new Set([outside.id]))).toEqual(bossIds(["limgrave"]));
  });
});
