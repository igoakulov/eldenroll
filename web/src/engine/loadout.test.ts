import { describe, expect, it } from "vitest";

import { isNone, type Item, type LoadoutSlot, type PoolSlot } from "./database";
import { countedItems, isSetReachable } from "./eligibility";
import { indexDatabase, poolKey } from "./engineData";
import { LOADOUT_ORDER, ashFits, rollLoadout, spellTypeFilter, type Loadout } from "./loadout";
import { realDatabase } from "./realDatabase.testing";
import { selectedLocations } from "./regions";
import { DEFAULT_STATS, STATS, type Stats } from "./settings";
import type { Option } from "./selectors";
import { matchesOption } from "./selectors";
import { seededRandom } from "./random";
import type { Random, RollContext } from "./slotRoll";
import { statDeficit, twoHandedHand } from "./stats";

const data = indexDatabase(realDatabase);
const CHARACTER_CLASSES = realDatabase.character_class.map((row) => row.id);
const MAXED = Object.fromEntries(STATS.map((stat) => [stat, 99])) as Stats;
const PARRY_ASHES = realDatabase.item
  .filter((row) => row.alias === "any_parry_ash")
  .map((row) => row.id);

function seeded(seed: number): Random {
  return seededRandom(seed).random;
}

function counted(regions: readonly string[], dead: readonly string[]): ReadonlySet<string> {
  return countedItems(data, {
    locations: selectedLocations(realDatabase, new Set(regions)),
    deadBosses: new Set(dead),
  });
}

const CASES = [
  {
    name: "every region, every boss dead, stats maxed",
    counted: counted(
      realDatabase.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen"),
      realDatabase.boss_instance.map((row) => row.id),
    ),
    stats: MAXED,
    maxStatGap: 0,
  },
  {
    name: "Limgrave, no boss dead, starting stats",
    counted: counted(["limgrave"], []),
    stats: DEFAULT_STATS,
    maxStatGap: 10,
  },
] as const;

function id(loadout: Loadout, slot: LoadoutSlot): string | null | undefined {
  const roll = loadout.get(slot);
  return roll === undefined ? undefined : (roll.chosen?.option.row.id ?? null);
}

function realItem(loadout: Loadout, slot: PoolSlot): Item | undefined {
  const value = id(loadout, slot);
  return value === null || value === undefined ? undefined : data.items.get(value);
}

function rolls(characterClass: string, testCase: (typeof CASES)[number], times: number): Loadout[] {
  const random = seeded(characterClass.length * 1000 + times);
  return Array.from({ length: times }, () =>
    rollLoadout({
      data,
      characterClass,
      boss: null,
      counted: testCase.counted,
      limits: { stats: testCase.stats, maxStatGap: testCase.maxStatGap },
      random,
    }),
  );
}

describe.each(CASES)("every roll on $name", (testCase) => {
  describe.each(CHARACTER_CLASSES)("%s", (characterClass) => {
    const loadouts = rolls(characterClass, testCase, 60);

    it("has exactly the slots the class has rows for", () => {
      const expected = LOADOUT_ORDER.filter(
        (slot) => slot === "armor" || data.pools.has(poolKey(characterClass, slot)),
      );
      for (const loadout of loadouts) expect([...loadout.keys()]).toEqual(expected);
    });

    it("rolls only what each slot's selectors allow, and reachable items and whole sets", () => {
      for (const loadout of loadouts) {
        for (const [slot, roll] of loadout) {
          if (roll.chosen === null) continue;
          const { option } = roll.chosen;
          if (slot === "armor") {
            expect(option.kind).toBe("armor_set");
            if (option.kind === "armor_set") {
              expect(isSetReachable(data, option.row, testCase.counted)).toBe(true);
            }
            continue;
          }
          const pool = data.pools.get(poolKey(characterClass, slot));
          expect(pool?.selectors.some((one) => matchesOption(one, option))).toBe(true);
          if (option.kind === "item") {
            expect(testCase.counted.has(option.row.id)).toBe(true);
          }
          expect(option.row.odds).toBeGreaterThan(0);
        }
      }
    });

    it("never breaks a stat limit", () => {
      for (const loadout of loadouts) {
        const rh = realItem(loadout, "rh");
        const lh = realItem(loadout, "lh");
        const spell = realItem(loadout, "spell");
        const slots = Object.fromEntries([...loadout].map(([slot, roll]) => [slot, roll.chosen?.option.row.id ?? null]));
        const twoHanded = twoHandedHand(data, characterClass, slots);
        if (rh !== undefined) {
          expect(statDeficit(rh, testCase.stats, twoHanded === "rh")).toBeLessThanOrEqual(testCase.maxStatGap);
        }
        if (lh !== undefined) {
          expect(statDeficit(lh, testCase.stats, twoHanded === "lh")).toBeLessThanOrEqual(testCase.maxStatGap);
        }
        if (spell !== undefined) {
          expect(statDeficit(spell, testCase.stats, false)).toBeLessThanOrEqual(testCase.maxStatGap);
        }
      }
    });

    it("never repeats an item or a talisman, though an empty slot may follow another", () => {
      for (const loadout of loadouts) {
        const rh = id(loadout, "rh");
        const lh = id(loadout, "lh");
        if (rh !== "none" && rh !== null) expect(lh).not.toBe(rh);
        const taken = id(loadout, "talisman_1");
        if (taken !== null && taken !== undefined && !isNone(taken)) expect(id(loadout, "talisman_2")).not.toBe(taken);
        const rhAsh = id(loadout, "rh_ash");
        if (rhAsh !== null && rhAsh !== undefined) expect(id(loadout, "lh_ash")).not.toBe(rhAsh);
      }
    });

    it("gives each ash a hand that can hold it", () => {
      for (const loadout of loadouts) {
        for (const [ash, hand] of [
          ["rh_ash", "rh"],
          ["lh_ash", "lh"],
        ] as const) {
          const rolledAsh = realItem(loadout, ash);
          if (rolledAsh === undefined) continue;
          const holder = realItem(loadout, hand);
          expect(holder).toBeDefined();
          if (holder !== undefined) expect(ashFits(data, rolledAsh.id, holder)).toBe(true);
        }
      }
    });

    it("casts only what the rolled catalyst can cast", () => {
      for (const loadout of loadouts) {
        const spell = realItem(loadout, "spell");
        if (spell === undefined || spell.id === "none") continue;
        const rh = realItem(loadout, "rh")?.subcategory;
        const lh = realItem(loadout, "lh")?.subcategory;
        const catalyst = [rh, lh].find((one) => one === "glintstone_staff" || one === "sacred_seal");
        if (catalyst === "glintstone_staff") expect(spell.category).toBe("sorcery");
        if (catalyst === "sacred_seal") expect(spell.category).toBe("incantation");
      }
    });

    it("keeps Parry only to a hand with a parry ash", () => {
      for (const loadout of loadouts) {
        if (id(loadout, "rule") !== "parry_only") continue;
        const ashes = [id(loadout, "rh_ash"), id(loadout, "lh_ash")];
        expect(ashes.some((ash) => typeof ash === "string" && PARRY_ASHES.includes(ash))).toBe(true);
      }
    });

    it("always fills the item, both talismans, the rule and the armor", () => {
      for (const loadout of loadouts) {
        for (const slot of ["item", "talisman_1", "talisman_2", "rule", "armor"] as const) {
          expect(id(loadout, slot)).not.toBeNull();
        }
      }
    });
  });
});

describe("class shapes", () => {
  const testCase = CASES[0];

  it("gives the casters no right-hand ash, and only Sorcerer a left-hand one", () => {
    for (const characterClass of ["sorcerer", "pyromancer"]) {
      for (const loadout of rolls(characterClass, testCase, 10)) {
        expect(loadout.has("rh_ash")).toBe(false);
        expect(loadout.has("lh_ash")).toBe(characterClass === "sorcerer");
      }
    }
  });

  it("leaves LH empty after a paired RH", () => {
    const paired = new Set(
      realDatabase.item
        .filter((row) => (row.subcategory === "fist" || row.subcategory === "claw") && row.id !== "venomous_fang")
        .map((row) => row.id),
    );
    let seen = 0;
    for (const loadout of rolls("warrior_dw", testCase, 300)) {
      const rh = id(loadout, "rh");
      if (typeof rh === "string" && paired.has(rh)) {
        seen += 1;
        expect(id(loadout, "lh")).toBe("none");
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("holds Poisoned Hand in a Warrior's LH only beside its poison partner", () => {
    const rot = realDatabase.modifier.find((row) => row.id === "rot_boosts_kindred_exultation")?.when[0];
    const rotIds = rot?.kind === "rolled" ? (rot.selector.ids ?? []) : [];
    const rotWeapon = realDatabase.item.find((row) => rotIds.includes(row.id) && row.category === "weapon" && row.str_bonus_2h);
    const lhAfter = (characterClass: string, rh: string, seed: number) =>
      id(
        rollLoadout({
          data,
          characterClass,
          boss: null,
          counted: testCase.counted,
          limits: { stats: testCase.stats, maxStatGap: testCase.maxStatGap },
          random: seeded(seed),
          from: "lh",
          kept: { rh, rh_ash: null },
        }),
        "lh",
      );
    expect(rotWeapon).toBeDefined();
    for (let seed = 0; seed < 20; seed += 1) {
      expect(lhAfter("warrior_2h", rotWeapon?.id ?? "", seed)).toBe("poisoned_hand");
      expect(lhAfter("warrior_2h", "zweihander", seed)).toBe("none");
      expect(lhAfter("warrior_dw", "venomous_fang", seed)).toBe("poisoned_hand");
      expect(lhAfter("warrior_dw", "longsword", seed)).not.toBe("poisoned_hand");
    }
  });

  it("gives Sorcerer sorceries and Pyromancer incantations", () => {
    for (const loadout of rolls("sorcerer", testCase, 30)) {
      expect(realItem(loadout, "spell")?.category).toBe("sorcery");
    }
    for (const loadout of rolls("pyromancer", testCase, 30)) {
      expect(realItem(loadout, "spell")?.category).toBe("incantation");
    }
  });

  it("gives an empty result when the only staff is out of reach", () => {
    const nothing = new Set<string>();
    const loadout = rollLoadout({
      data,
      characterClass: "sorcerer",
      boss: null,
      counted: nothing,
      limits: { stats: MAXED, maxStatGap: 0 },
      random: seeded(1),
    });
    expect(id(loadout, "rh")).toBeNull();
    expect(loadout.get("rh")?.probability).toBe(0);
  });

  it("gives a hand that rolled none no ash", () => {
    let seen = 0;
    for (const loadout of rolls("jester", testCase, 100)) {
      if (id(loadout, "rh") === "none") {
        seen += 1;
        expect(id(loadout, "rh_ash")).toBeNull();
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("armor", () => {
  it("makes Raptor's or Gravebird nearly certain under Jump attacks only", () => {
    const random = seeded(5);
    const jumpSets = ["raptors_set", "gravebird_set"];
    let hits = 0;
    for (let roll = 0; roll < 100; roll += 1) {
      const loadout = rollLoadout({
        data,
        characterClass: "knight",
        boss: null,
        counted: CASES[0].counted,
        limits: { stats: MAXED, maxStatGap: 0 },
        random,
        from: "armor",
        kept: { rule: "jump_attacks_only" },
      });
      if (jumpSets.includes(id(loadout, "armor") ?? "")) hits += 1;
    }
    expect(hits).toBeGreaterThanOrEqual(95);
  });

  it("rolls Use a summon only beside Dried Bouquet, also while the second talisman slot is closed", () => {
    const random = seeded(8);
    const margit = "margit_the_fell_omen_stormveil_castle";
    const rules = (kept: Record<string, string>, alive: ReadonlySet<string>) =>
      Array.from({ length: 200 }, () =>
        id(
          rollLoadout({
            data,
            characterClass: "sorcerer",
            boss: null,
            counted: CASES[0].counted,
            limits: { stats: MAXED, maxStatGap: 0 },
            random,
            from: "rule",
            kept,
            alive,
          }),
          "rule",
        ),
      );
    expect(rules({ talisman_1: "radagons_soreseal" }, new Set([margit]))).not.toContain("use_a_summon");
    expect(rules({ talisman_1: "radagons_soreseal", talisman_2: "axe_talisman" }, new Set())).not.toContain("use_a_summon");
    expect(rules({ talisman_1: "radagons_soreseal", talisman_2: "dried_bouquet" }, new Set())).toContain("use_a_summon");
  });

  it("makes the Naked Set nearly certain under No armor", () => {
    const random = seeded(6);
    let hits = 0;
    for (let roll = 0; roll < 100; roll += 1) {
      const loadout = rollLoadout({
        data,
        characterClass: "knight",
        boss: null,
        counted: CASES[0].counted,
        limits: { stats: MAXED, maxStatGap: 0 },
        random,
        from: "armor",
        kept: { rule: "no_armor" },
      });
      if (id(loadout, "armor") === "naked_set") hits += 1;
    }
    expect(hits).toBeGreaterThanOrEqual(99);
  });

  it("dresses Blue Dancer Charm in a light set, unless a rule needs equip load", () => {
    const random = seeded(7);
    const light = new Set(
      data.database.modifier.find((row) => row.id === "blue_dancer_charm_boosts_light_sets")
        ?.target.ids,
    );
    const armorWith = (rule: string) =>
      id(
        rollLoadout({
          data,
          characterClass: "knight",
          boss: null,
          counted: CASES[0].counted,
          limits: { stats: MAXED, maxStatGap: 0 },
          random,
          from: "armor",
          kept: { talisman_1: "blue_dancer_charm", rule: rule },
        }),
        "armor",
      ) ?? "";
    let hits = 0;
    for (let roll = 0; roll < 100; roll += 1) {
      if (light.has(armorWith("none"))) hits += 1;
      expect(light.has(armorWith("overloaded"))).toBe(false);
    }
    expect(hits).toBeGreaterThanOrEqual(95);
  });
});

describe("spellTypeFilter", () => {
  const rule = { kind: "item" as const };

  function keeps(rolled: Partial<Record<PoolSlot, string>>, spell: Item): boolean {
    const context: RollContext = {
      data,
      counted: new Set(),
      state: { characterClass: "x", boss: null, rolled: new Map(Object.entries(rolled)) as Map<PoolSlot, string> },
    };
    const option: Option = { ...rule, row: spell };
    return spellTypeFilter(context)(option);
  }

  const sorcery = realDatabase.item.find((row) => row.category === "sorcery") as Item;
  const incantation = realDatabase.item.find((row) => row.category === "incantation") as Item;
  const none = realDatabase.item.find((row) => row.category === "none") as Item;

  it("lets a staff cast sorceries, and a seal incantations", () => {
    expect(keeps({ rh: "astrologers_staff" }, sorcery)).toBe(true);
    expect(keeps({ rh: "astrologers_staff" }, incantation)).toBe(false);
    expect(keeps({ lh: "finger_seal" }, incantation)).toBe(true);
    expect(keeps({ lh: "finger_seal" }, sorcery)).toBe(false);
  });

  it("lets RH win when the hands disagree", () => {
    expect(keeps({ rh: "astrologers_staff", lh: "finger_seal" }, sorcery)).toBe(true);
    expect(keeps({ rh: "astrologers_staff", lh: "finger_seal" }, incantation)).toBe(false);
  });

  it("keeps none, and everything when no catalyst rolled", () => {
    expect(keeps({ rh: "demi_human_queens_staff" }, none)).toBe(true);
    expect(keeps({ rh: "uchigatana" }, sorcery)).toBe(true);
    expect(keeps({ rh: "uchigatana" }, incantation)).toBe(true);
  });
});

describe("ashFits", () => {
  it("needs the weapon to hold ashes, whatever a class row says", () => {
    const noAsh = realDatabase.item.find(
      (row) => row.subcategory === "katana" && row.infusable === false,
    ) as Item;
    const katana = data.items.get("uchigatana") as Item;
    const ash = realDatabase.ash_compatibility.find(
      (row) => row.subcategory === "katana",
    )?.ash_id as string;
    expect(ashFits(data, ash, katana)).toBe(true);
    expect(ashFits(data, ash, noAsh)).toBe(false);
  });

  it("treats Parry as one option on a weapon and several on a shield", () => {
    const dagger = data.items.get("dagger") as Item;
    const shield = data.items.get("brass_shield") as Item;
    const forDagger = PARRY_ASHES.filter((one) => ashFits(data, one, dagger));
    const forShield = PARRY_ASHES.filter((one) => ashFits(data, one, shield));
    expect(forDagger).toEqual(["parry"]);
    expect(forShield.length).toBeGreaterThan(1);
  });

});

