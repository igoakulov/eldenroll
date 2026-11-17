import { describe, expect, it } from "vitest";

import type { Database, Item, Modifier, PoolSlot } from "./database";
import { countedItems } from "./eligibility";
import { indexDatabase, type EngineData } from "./engineData";
import { DEFAULT_HYPERPARAMS } from "./hyperparams";
import { realDatabase } from "./realDatabase.testing";
import { selectedLocations } from "./regions";
import { matchesOption } from "./selectors";
import {
  sample,
  slotOptions,
  tallyKey,
  tallyScope,
  weighOptions,
  type OptionFilter,
  type Random,
  type RollContext,
  type SlotPoolResult,
} from "./slotRoll";

type Rolled = Partial<Record<PoolSlot, string | null>>;

const real = indexDatabase(realDatabase);

function rollSlot(context: RollContext, slot: PoolSlot, random: Random) {
  return sample(weighOptions(context, slotOptions(context.data, context.state.characterClass, slot)), random);
}
const ALL_REGIONS = new Set(
  realDatabase.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen"),
);
const ALL_BOSSES = new Set(realDatabase.boss_instance.map((row) => row.id));
const EVERYTHING = countedFor(ALL_REGIONS, ALL_BOSSES);

function countedFor(regions: ReadonlySet<string>, dead: ReadonlySet<string>): ReadonlySet<string> {
  return countedItems(real, {
    locations: selectedLocations(realDatabase, regions),
    deadBosses: dead,
  });
}

function pool(
  characterClass: string,
  slot: PoolSlot,
  rolled: Rolled = {},
  counted: ReadonlySet<string> = EVERYTHING,
  data: EngineData = real,
  boss: string | null = null,
): SlotPoolResult {
  const state = { characterClass, boss, rolled: new Map(Object.entries(rolled)) as Map<PoolSlot, string | null> };
  return weighOptions({ data, state, counted }, slotOptions(data, characterClass, slot));
}

function ids(result: SlotPoolResult): string[] {
  return result.options.map((row) => row.option.row.id);
}

function weightOf(result: SlotPoolResult, id: string): number | undefined {
  return result.options.find((row) => row.option.row.id === id)?.weight;
}

function item(id: string): Item {
  const row = real.items.get(id);
  if (row === undefined) throw new Error(`no item ${id}`);
  return row;
}

const KNIGHT_MELEE: Rolled = { rh: "uchigatana", rh_ash: "no_skill", lh: "brass_shield", lh_ash: "no_skill" };

describe("slot pools on the real data", () => {
  it("drops options at odds 0, and counts them nowhere", () => {
    const result = pool("jester", "item");
    expect(result.pool).toBe(result.options.length);
    expect(ids(result)).not.toContain("lamenters_mask");
  });

  it("gives None its base odds as a rule", () => {
    const odds = realDatabase.combat_rule.find((row) => row.id === "none")!.odds;
    expect(weightOf(pool("knight", "rule_1"), "none")).toBe(odds);
  });

  it("gives Jester's empty hand its x6, and only there", () => {
    expect(weightOf(pool("jester", "rh"), "none")).toBe(modifierRow("jester_none_x6").value);
    expect(weightOf(pool("warrior_2h", "lh"), "none")).toBe(1);
  });

  it("gives a seal and a staff their own base odds", () => {
    const result = pool("spellblade", "lh");
    expect(weightOf(result, "finger_seal")).toBe(item("finger_seal").odds);
    expect(weightOf(result, "astrologers_staff")).toBe(item("astrologers_staff").odds);
  });
});

function modifierRow(id: string): Modifier {
  const row = realDatabase.modifier.find((one) => one.id === id);
  if (row === undefined) throw new Error(`no modifier ${id}`);
  return row;
}

function ruleOdds(id: string): number {
  const row = realDatabase.combat_rule.find((one) => one.id === id);
  if (row === undefined) throw new Error(`no rule ${id}`);
  return row.odds;
}

describe("a condition on a slot not rolled yet", () => {
  it("leaves Dual-Wield Warrior RH losing only what the class itself removes", () => {
    const result = pool("warrior_dw", "rh");
    const options = slotOptions(real, "warrior_dw", "rh").filter(
      (one) => one.row.odds > 0 && EVERYTHING.has(one.row.id),
    );
    const classRemovals = realDatabase.modifier.filter(
      (row) => row.value === 0 && row.when.every((c) => c.kind === "character_class" && c.ids.includes("warrior_dw")),
    );
    const removed = options.filter((one) => !ids(result).includes(one.row.id));
    expect(removed.map((one) => one.row.id)).toContain("grafted_dragon");
    for (const one of removed) expect(classRemovals.some((row) => matchesOption(row.target, one))).toBe(true);
    const classes = modifierRow("warrior_dw_boosts_paired_subcategories");
    const weapons = modifierRow("warrior_dw_boosts_paired_weapons");
    for (const row of result.options) {
      const item = row.option.row as Item;
      const boost = classes.target.ids?.includes(item.subcategory ?? "")
        ? classes.value
        : weapons.target.ids?.includes(item.id)
          ? weapons.value
          : 1;
      expect(row.weight).toBe(item.odds * boost);
    }
  });

  it("is inactive when it says does not match, so a rule survives until its slot rolls", () => {
    expect(ids(pool("knight", "rule_1"))).toContain("parry_only");
  });

  it("leaves the rule exclusions off rule_1's own pool", () => {
    expect(ids(pool("knight", "rule_1", KNIGHT_MELEE))).toContain("overloaded");
  });
});

describe("a slot the class has no row for", () => {
  it("counts as rolled with nothing, so Parry only leaves the casters", () => {
    const result = pool("sorcerer", "rule_1", { rh: "astrologers_staff", lh: "none" });
    expect(ids(result)).not.toContain("parry_only");
    expect(ids(result)).not.toContain("l2_only");
  });
});

describe("modifiers across slots", () => {
  it("boosts Dual-Wield Warrior LH of RH's class against other classes", () => {
    const result = pool("warrior_dw", "lh", { rh: "uchigatana" });
    const katana = result.options.filter((row) => item(row.option.row.id).subcategory === "katana");
    const other = result.options.filter((row) => item(row.option.row.id).subcategory !== "katana");
    expect(katana.length).toBeGreaterThan(0);
    const odds = (row: (typeof result.options)[number]) => item(row.option.row.id).odds;
    for (const row of katana) expect(row.weight).toBe(odds(row) * modifierRow("warrior_dw_pairs_katana").value);
    for (const row of other) expect(row.weight).toBe(odds(row));
    expect(ids(result)).not.toContain("none");
  });

  it("leaves LH with only none after a paired RH", () => {
    expect(ids(pool("warrior_dw", "lh", { rh: "caestus" }))).toEqual(["none"]);
  });

  it("takes Knight's shield away with a thrusting shield, and keeps it otherwise", () => {
    expect(ids(pool("knight", "lh", { rh: "dueling_shield" }))).toEqual(["none"]);
    const melee = ids(pool("knight", "lh", { rh: "uchigatana" }));
    expect(melee).toContain("brass_shield");
    expect(melee).not.toContain("none");
  });

  it("removes the item none without touching the rule None", () => {
    const rolled = { ...KNIGHT_MELEE };
    expect(ids(pool("knight", "spell", rolled))).toEqual([]);
    expect(ids(pool("knight", "rule_1", rolled))).toContain("none");
  });

  it("reads rule_1 for rule_2's exclusions, both ways", () => {
    const first = ids(pool("knight", "rule_2", { ...KNIGHT_MELEE, rule_1: "do_not_get_hit" }));
    expect(first).not.toContain("overloaded");
    const second = ids(pool("knight", "rule_2", { ...KNIGHT_MELEE, rule_1: "overloaded" }));
    expect(second).not.toContain("do_not_get_hit");
  });

  it("needs a parry ash for Parry only, and boosts it with one", () => {
    expect(ids(pool("knight", "rule_1", KNIGHT_MELEE))).not.toContain("parry_only");
    const withParry = pool("knight", "rule_1", { ...KNIGHT_MELEE, lh_ash: "parry" });
    expect(weightOf(withParry, "parry_only")).toBe(
      ruleOdds("parry_only") * modifierRow("parry_ash_boosts_parry_only").value,
    );
  });

  it("makes a named talisman's rule top tier", () => {
    const result = pool("knight", "rule_1", { ...KNIGHT_MELEE, talisman_1: "claw_talisman" });
    expect(weightOf(result, "jump_attacks_only")).toBe(
      ruleOdds("jump_attacks_only") * modifierRow("claw_talisman_makes_jump_attacks_top").value,
    );
  });

  it("removes Blue Dancer Charm for a heavy RH, whatever the class", () => {
    expect(ids(pool("warrior_2h", "talisman_1", { rh: "uchigatana", lh: "none" }))).toContain(
      "blue_dancer_charm",
    );
    expect(ids(pool("warrior_2h", "talisman_1", { rh: "zweihander", lh: "none" }))).not.toContain(
      "blue_dancer_charm",
    );
  });
});

describe("location filter on the real data", () => {
  const LIMGRAVE = new Set(["limgrave"]);
  const morgott = realDatabase.item_location.find(
    (row) => row.item_id === "morgotts_cursed_sword" && row.boss_instance_id !== null,
  )?.boss_instance_id;

  it("keeps consumables with no location rows", () => {
    const result = pool("knight", "item", {}, countedFor(LIMGRAVE, new Set()));
    expect(ids(result)).toContain(realDatabase.item.find((row) => row.category === "consumable")?.id);
  });

  it("holds a boss's weapon back until the boss is dead, whatever the region", () => {
    if (morgott === undefined || morgott === null) throw new Error("Morgott has no row");
    const alive = pool("warrior_2h", "rh", {}, countedFor(LIMGRAVE, new Set()));
    expect(ids(alive)).not.toContain("morgotts_cursed_sword");
    const dead = pool("warrior_2h", "rh", {}, countedFor(LIMGRAVE, new Set([morgott])));
    expect(ids(dead)).toContain("morgotts_cursed_sword");
  });
});

describe("on a small database", () => {
  const row = (id: string, odds = 1): Item => ({
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
    odds,
  });

  function small(modifier: readonly Modifier[]): EngineData {
    const database: Database = {
      region: [],
      location: [],
      boss_instance: [],
      item: [row("none"), row("a"), row("b"), row("off", 0)],
      armor_set: [],
      ash_compatibility: [],
      combat_rule: [],
      character_class: [{ id: "only", name: "Only", odds: 1 }],
      slot_pool: [
        {
          character_class_id: "only",
          slot: "talisman_1",
          selectors: [{ kind: "category", ids: ["talisman"] }],
        },
        { character_class_id: "only", slot: "rh", selectors: [{ kind: "category", ids: ["none"] }] },
      ],
      alias: [],
      item_location: [],
      modifier,
    };
    return indexDatabase(database);
  }

  const COUNTED = new Set(["a", "b", "off"]);
  const whenCharacterClass = [{ kind: "character_class", ids: ["only"] }] as const;
  const targetA = { kind: "item", ids: ["a"] } as const;

  function smallPool(data: EngineData, rolled: Rolled = {}, boss: string | null = null) {
    return pool("only", "talisman_1", rolled, COUNTED, data, boss);
  }

  it("compounds two modifiers that both hold", () => {
    const data = small([
      { id: "m1", when: whenCharacterClass, target: targetA, value: 10 },
      { id: "m2", when: whenCharacterClass, target: targetA, value: 2 },
    ]);
    expect(weightOf(smallPool(data), "a")).toBe(20);
  });

  it("lets a zero beat any boost", () => {
    const data = small([
      { id: "m1", when: whenCharacterClass, target: targetA, value: 1_000_000 },
      { id: "m2", when: whenCharacterClass, target: targetA, value: 0 },
    ]);
    expect(ids(smallPool(data))).toEqual(["b"]);
  });

  it("needs every condition of a row", () => {
    const rolledRh = {
      kind: "rolled",
      slots: ["rh"],
      selector: { kind: "category", ids: ["none"] },
      negated: false,
    } as const;
    const data = small([{ id: "m", when: [...whenCharacterClass, rolledRh], target: targetA, value: 3 }]);
    expect(weightOf(smallPool(data), "a")).toBe(1);
    expect(weightOf(smallPool(data, { rh: "none" }), "a")).toBe(3);
  });

  it("reads an empty result as none", () => {
    const rolledRh = {
      kind: "rolled",
      slots: ["rh"],
      selector: { kind: "category", ids: ["none"] },
      negated: false,
    } as const;
    const data = small([{ id: "m", when: [rolledRh], target: targetA, value: 3 }]);
    expect(weightOf(smallPool(data, { rh: null }), "a")).toBe(3);
  });

  it("holds when either listed slot matches, applied once", () => {
    const eitherHand = {
      kind: "rolled",
      slots: ["rh", "lh"],
      selector: { kind: "category", ids: ["none"] },
      negated: false,
    } as const;
    const data = small([{ id: "m", when: [eitherHand], target: targetA, value: 3 }]);
    expect(weightOf(smallPool(data, { rh: "a", lh: "none" }), "a")).toBe(3);
    expect(weightOf(smallPool(data, { rh: "none", lh: "none" }), "a")).toBe(3);
  });

  it("reads the boss, which is known from the start", () => {
    const rolledBoss = {
      kind: "rolled",
      slots: ["boss"],
      selector: { kind: "boss", ids: ["radahn"] },
      negated: false,
    } as const;
    const data = small([{ id: "m", when: [rolledBoss], target: targetA, value: 3 }]);
    expect(weightOf(smallPool(data, {}, "radahn"), "a")).toBe(3);
    expect(weightOf(smallPool(data, {}, "godrick"), "a")).toBe(1);
  });

  it("removes a filtered option before modifiers, so a boost can't bring it back", () => {
    const data = small([{ id: "m", when: whenCharacterClass, target: targetA, value: 1_000_000 }]);
    const notA: OptionFilter = (option) => option.row.id !== "a";
    const state = { characterClass: "only", boss: null, rolled: new Map<PoolSlot, string | null>() };
    const options = slotOptions(data, "only", "talisman_1");
    expect(
      weighOptions({ data, state, counted: COUNTED }, options, { rules: [notA] }).options.map(
        (one) => one.option.row.id,
      ),
    ).toEqual(["b"]);
  });

  describe("sampling", () => {
    const data = small([{ id: "m", when: whenCharacterClass, target: targetA, value: 3 }]);
    const context = {
      data,
      state: { characterClass: "only", boss: null, rolled: new Map<PoolSlot, string | null>() },
      counted: COUNTED,
    };

    it.each([
      [0, "a", 0.75],
      [0.749, "a", 0.75],
      [0.75, "b", 0.25],
      [0.999, "b", 0.25],
    ])("turns a random %s into %s at probability %s", (value, id, probability) => {
      const roll = rollSlot(context, "talisman_1", () => value);
      expect(roll.chosen?.option.row.id).toBe(id);
      expect(roll.probability).toBe(probability);
      expect(roll.pool).toBe(2);
    });

    it("reports the modifiers behind the chosen option", () => {
      const roll = rollSlot(context, "talisman_1", () => 0);
      expect(roll.chosen?.modifiers.map((row) => row.id)).toEqual(["m"]);
    });

    it("gives an empty result when nothing is left", () => {
      const roll = sample({ pool: 0, options: [], tally: {} }, () => 0.5);
      expect(roll.chosen).toBeNull();
      expect(roll.probability).toBe(0);
    });

    it("returns an empty result for a slot the class has no row for", () => {
      const roll = rollSlot(context, "lh", () => 0.5);
      expect(roll.chosen).toBeNull();
    });

    it("gives the same result for the same random numbers", () => {
      const sequence = () => {
        const values = [0.1, 0.8, 0.5];
        return values.map((value) => rollSlot(context, "talisman_1", () => value).chosen?.option.row.id);
      };
      expect(sequence()).toEqual(sequence());
    });
  });
});

describe("catch-up", () => {
  const catchUp = DEFAULT_HYPERPARAMS.catchUp;
  /** Weighs a slot's pool for a class with each option's tally from `had`, by item or set id; unlisted ones at `rest`. */
  const weigh = (slot: "rh" | "item" | "armor", had: Record<string, number>, rest = 1, rolled: Rolled = {}) => {
    const state = { characterClass: "knight", boss: null, rolled: new Map(Object.entries(rolled)) as Map<PoolSlot, string | null> };
    const scope = tallyScope(catchUp, "knight", slot);
    const options = slotOptions(real, "knight", slot);
    const tally = Object.fromEntries(options.map((option) => [tallyKey(scope, option), had[option.row.id] ?? rest * option.row.odds]));
    return weighOptions({ data: real, state, counted: EVERYTHING, catchUp, tally: { had: tally, scope } }, options);
  };
  const shareOf = (result: SlotPoolResult, ids: readonly string[]) =>
    result.options.filter((row) => ids.includes(row.option.row.id)).reduce((sum, row) => sum + row.weight, 0) /
    result.options.reduce((sum, row) => sum + row.weight, 0);

  it("rolls every option at its odds when each has had as much as its peers", () => {
    for (const row of weigh("rh", {}).options) expect(row.catchUp).toBeCloseTo(1);
  });

  it("gives the roll to a sword behind its peers and none to one ahead of them", () => {
    const result = weigh("rh", { miquellan_knights_sword: 0, crystal_sword: 3 });
    expect(weightOf(result, "crystal_sword")).toBe(0);
    const late = weightOf(result, "miquellan_knights_sword")!;
    expect(result.options.every((row) => row.option.row.id === "miquellan_knights_sword" || row.weight < late)).toBe(true);
  });

  it("leaves consumables, found everywhere, their share of the item slot however far a tool is behind", () => {
    const found = (result: SlotPoolResult) => shareOf(result, [...real.foundEverywhere]);
    expect(found(weigh("item", { horned_bairn: 0 }, 5))).toBeCloseTo(found(weigh("item", {})));
  });

  it("keeps a guarantee on sets that have shown far more than their peers", () => {
    const jumpSets = ["raptors_set", "gravebird_set"];
    const ahead = { raptors_set: 10, gravebird_set: 10 };
    expect(shareOf(weigh("armor", ahead, 0, { rule_1: "jump_attacks_only" }), jumpSets)).toBeGreaterThan(0.99);
    expect(shareOf(weigh("armor", ahead, 0), jumpSets)).toBe(0);
  });
});

