import { describe, expect, it } from "vitest";

import type { Item, PoolSlot } from "./database";
import { countedItems } from "./eligibility";
import { indexDatabase } from "./engineData";
import { realDatabase } from "./realDatabase.testing";
import { selectedLocations } from "./regions";
import { DEFAULT_STATS, STATS, type Stats } from "./settings";
import type { Option } from "./selectors";
import type { RollContext } from "./slotRoll";
import { lhStatFilter, plainStatFilter, rhStatFilter, statDeficit } from "./stats";

const data = indexDatabase(realDatabase);
const counted = countedItems(data, {
  locations: selectedLocations(
    realDatabase,
    new Set(realDatabase.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen")),
  ),
  deadBosses: new Set(realDatabase.boss_instance.map((row) => row.id)),
  bossItemsOnlyFromDeadBosses: true,
});

const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;

function item(id: string): Item {
  const row = data.items.get(id);
  if (row === undefined) throw new Error(`no item ${id}`);
  return row;
}

function option(id: string): Option {
  return { kind: "item", row: item(id) };
}

function context(build: string, rolled: Partial<Record<PoolSlot, string | null>> = {}): RollContext {
  const map = new Map(Object.entries(rolled)) as Map<PoolSlot, string | null>;
  return { data, counted, state: { build, boss: null, rolled: map } };
}

/** The lowest Strength that reaches `required` only with the two-handed bonus. */
function strengthOnlyTwoHandingReaches(required: number): Stats {
  const str = Math.ceil(required / 1.5);
  expect(str).toBeLessThan(required);
  return { ...MAXED, str };
}

describe("statDeficit", () => {
  const row = { str: 20, dex: 15, int: 10, fth: 8, arc: 5 } as Item;

  it("is zero when every requirement is met", () => {
    expect(statDeficit(row, { ...DEFAULT_STATS, str: 20, dex: 15, fth: 8 }, false)).toBe(0);
  });

  it("adds what each stat falls short, and never credits a surplus", () => {
    const stats: Stats = { ...MAXED, str: 18, dex: 12, int: 9, fth: 7, arc: 4 };
    expect(statDeficit(row, stats, false)).toBe(2 + 3 + 1 + 1 + 1);
  });

  it("ignores VIG, MIND and END", () => {
    expect(statDeficit(row, { ...MAXED, vig: 1, mind: 1, end: 1 }, false)).toBe(0);
  });

  it("rounds two-handed Strength down", () => {
    const strOnly = { str: 22, dex: 0, int: 0, fth: 0, arc: 0 } as Item;
    expect(statDeficit(strOnly, { ...MAXED, str: 15 }, true)).toBe(0);
    expect(statDeficit(strOnly, { ...MAXED, str: 15 }, false)).toBe(7);
    expect(statDeficit({ ...strOnly, str: 23 }, { ...MAXED, str: 15 }, true)).toBe(1);
  });

  it("leaves Beastclaw Greathammer one point short at 13 Strength two-handed", () => {
    const hammer = item("beastclaw_greathammer");
    expect(hammer.str).toBe(20);
    expect(statDeficit(hammer, { ...MAXED, str: 13 }, true)).toBe(1);
    expect(statDeficit(hammer, { ...MAXED, str: 14 }, true)).toBe(0);
  });

  it("applies the bonus to Strength alone", () => {
    const both = { str: 30, dex: 30, int: 0, fth: 0, arc: 0 } as Item;
    expect(statDeficit(both, { ...MAXED, str: 20, dex: 20 }, true)).toBe(10);
  });
});

describe("plainStatFilter", () => {
  const spell = realDatabase.item.find((row) => row.category === "sorcery" && row.int > 10);
  if (spell === undefined) throw new Error("no sorcery needs INT above 10");
  const candidate: Option = { kind: "item", row: spell };

  it("keeps a spell within the gap, measured per item", () => {
    const stats = { ...MAXED, int: spell.int - 5 };
    expect(plainStatFilter({ stats, maxStatGap: 5 })(candidate)).toBe(true);
    expect(plainStatFilter({ stats, maxStatGap: 4 })(candidate)).toBe(false);
  });

  it("leaves requirement-free items and rules alone", () => {
    const limits = { stats: { ...MAXED, str: 1, dex: 1, int: 1, fth: 1, arc: 1 }, maxStatGap: 0 };
    const filter = plainStatFilter(limits);
    expect(filter(option("none"))).toBe(true);
    const rule = data.rules.get("parry_only");
    if (rule === undefined) throw new Error("no rule");
    expect(filter({ kind: "rule", row: rule })).toBe(true);
  });
});

describe("rhStatFilter looks ahead at LH", () => {
  const zweihander = item("zweihander");
  const needsBonus = { stats: strengthOnlyTwoHandingReaches(zweihander.str), maxStatGap: 0 };

  it("gives 2H Warrior the bonus, because LH can only be none", () => {
    expect(rhStatFilter(context("warrior_2h"), needsBonus)(option("zweihander"))).toBe(true);
  });

  it("denies the bonus when LH can hold something", () => {
    expect(rhStatFilter(context("knight"), needsBonus)(option("zweihander"))).toBe(false);
    expect(rhStatFilter(context("warrior_dw"), needsBonus)(option("zweihander"))).toBe(false);
    expect(rhStatFilter(context("spellblade"), needsBonus)(option("zweihander"))).toBe(false);
  });

  it("keeps a weapon the player can wield one-handed, in any build", () => {
    const met = { stats: MAXED, maxStatGap: 0 };
    expect(rhStatFilter(context("knight"), met)(option("zweihander"))).toBe(true);
  });

  it("rejects a weapon even the bonus can't reach", () => {
    const short = { stats: { ...MAXED, str: needsBonus.stats.str - 1 }, maxStatGap: 0 };
    expect(rhStatFilter(context("warrior_2h"), short)(option("zweihander"))).toBe(false);
  });

  it("gives Knight the bonus only with a thrusting shield", () => {
    const shield = item("dueling_shield");
    const limits = { stats: strengthOnlyTwoHandingReaches(shield.str), maxStatGap: 0 };
    expect(rhStatFilter(context("knight"), limits)(option("dueling_shield"))).toBe(true);
  });

  it("gives Dual-Wield Warrior the bonus only on the one paired weapon that keeps it", () => {
    const starscourge = item("starscourge_greatsword");
    const limits = { stats: strengthOnlyTwoHandingReaches(starscourge.str), maxStatGap: 0 };
    expect(rhStatFilter(context("warrior_dw"), limits)(option("starscourge_greatsword"))).toBe(true);
  });

  it("denies a paired weapon the bonus although LH stays empty", () => {
    const paired = item("ornamental_straight_sword");
    const limits = { stats: strengthOnlyTwoHandingReaches(paired.str), maxStatGap: 0 };
    expect(rhStatFilter(context("warrior_2h"), limits)(option("ornamental_straight_sword"))).toBe(
      false,
    );
  });

  it("doesn't count the RH weapon itself as a possible LH", () => {
    const alone: RollContext = { ...context("warrior_dw"), counted: new Set(["zweihander"]) };
    expect(rhStatFilter(alone, needsBonus)(option("zweihander"))).toBe(true);
  });

  it("treats a hand with no reachable option as empty", () => {
    const nothing: RollContext = { ...context("knight"), counted: new Set() };
    expect(rhStatFilter(nothing, needsBonus)(option("zweihander"))).toBe(true);
  });

  it("lets Max stat gap cover what the bonus doesn't", () => {
    const stats = { ...MAXED, str: zweihander.str - 3 };
    expect(rhStatFilter(context("knight"), { stats, maxStatGap: 3 })(option("zweihander"))).toBe(true);
    expect(rhStatFilter(context("knight"), { stats, maxStatGap: 2 })(option("zweihander"))).toBe(false);
  });
});

describe("lhStatFilter reads the rolled RH", () => {
  const zweihander = item("zweihander");
  const needsBonus = { stats: strengthOnlyTwoHandingReaches(zweihander.str), maxStatGap: 0 };

  it("denies the bonus while RH holds something", () => {
    const filter = lhStatFilter(context("warrior_dw", { rh: "uchigatana" }), needsBonus);
    expect(filter(option("zweihander"))).toBe(false);
  });

  it("gives the bonus when RH is empty", () => {
    expect(lhStatFilter(context("warrior_dw", { rh: null }), needsBonus)(option("zweihander"))).toBe(true);
    expect(lhStatFilter(context("warrior_dw", { rh: "none" }), needsBonus)(option("zweihander"))).toBe(true);
  });
});
