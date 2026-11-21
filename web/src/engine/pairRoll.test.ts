import { describe, expect, it } from "vitest";

import type { Modifier, PoolSlot } from "./database";
import { indexDatabase } from "./engineData";
import { DEFAULT_HYPERPARAMS } from "./hyperparams";
import { rollSecondOfPair } from "./pairRoll";
import { realDatabase } from "./realDatabase.testing";
import { selectedLocations } from "./regions";
import { countedItems } from "./eligibility";
import { slotOptions, weighOptions, type SlotPoolResult } from "./slotRoll";

const real = indexDatabase(realDatabase);
const EVERYTHING = countedItems(real, {
  locations: selectedLocations(realDatabase, new Set(realDatabase.region.map((row) => row.id).filter((id) => id !== "leyndell_ashen"))),
  deadBosses: new Set(realDatabase.boss_instance.map((row) => row.id)),
});
const KNIGHT_PARRY = { rh: "uchigatana", rh_ash: "no_skill", lh: "brass_shield", lh_ash: "parry" };

function modifierRow(id: string): Modifier {
  const row = realDatabase.modifier.find((one) => one.id === id);
  if (row === undefined) throw new Error(`no modifier ${id}`);
  return row;
}

/** The second slot's weights once the first holds `taken`, and its weights taken alone. */
function second(characterClass: string, slots: readonly [PoolSlot, PoolSlot], rolled: Record<string, string>, taken: string) {
  const state = { characterClass, boss: null, rolled: new Map(Object.entries(rolled)) as Map<PoolSlot, string | null> };
  const alone: SlotPoolResult = weighOptions({ data: real, state, counted: EVERYTHING }, slotOptions(real, characterClass, slots[1]));
  const option = slotOptions(real, characterClass, slots[0]).find((one) => one.row.id === taken)!;
  const roll = rollSecondOfPair(real, state, slots, alone, option, () => 0, DEFAULT_HYPERPARAMS.catchUp.boosted);
  const weight = (result: { options: SlotPoolResult["options"] }, id: string) =>
    result.options.find((row) => row.option.row.id === id)?.weight ?? 0;
  return (id: string) => weight(roll, id) / weight(alone, id);
}

describe("paired slots", () => {
  it("keeps a paired option at its base odds or more when catch-up would sit it out", () => {
    const state = { characterClass: "knight", boss: null, rolled: new Map(Object.entries(KNIGHT_PARRY)) as Map<PoolSlot, string | null> };
    const alone = weighOptions({ data: real, state, counted: EVERYTHING }, slotOptions(real, "knight", "talisman_2"));
    const sidelined: SlotPoolResult = {
      ...alone,
      options: alone.options.map((row) => (row.option.row.id === "blade_of_mercy" ? { ...row, weight: 0, catchUp: 0 } : row)),
    };
    const dagger = slotOptions(real, "knight", "talisman_1").find((one) => one.row.id === "dagger_talisman")!;
    const roll = rollSecondOfPair(real, state, ["talisman_1", "talisman_2"], sidelined, dagger, () => 0, DEFAULT_HYPERPARAMS.catchUp.boosted);
    const mercy = roll.options.find((row) => row.option.row.id === "blade_of_mercy")!;
    const plain = alone.options.find((row) => row.option.row.id === "blade_of_mercy")!.plain;
    expect(mercy.weight).toBeCloseTo(plain * modifierRow("mercy_joins_dagger").value);
  });

  it("links two talismans with one row, whichever comes first", () => {
    const value = modifierRow("mercy_joins_dagger").value;
    const pair = ["talisman_1", "talisman_2"] as const;
    expect(second("knight", pair, KNIGHT_PARRY, "dagger_talisman")("blade_of_mercy")).toBeCloseTo(value);
    expect(second("knight", pair, KNIGHT_PARRY, "blade_of_mercy")("dagger_talisman")).toBeCloseTo(value);
    expect(second("knight", pair, KNIGHT_PARRY, "dagger_talisman")("dagger_talisman")).toBe(0);
  });

  it("lets None fill both rule slots, and weighs None beside a rule more", () => {
    const pair = ["rule_1", "rule_2"] as const;
    const value = modifierRow("none_beside_a_rule").value;
    expect(second("knight", pair, KNIGHT_PARRY, "none")("none")).toBeCloseTo(1);
    expect(second("knight", pair, KNIGHT_PARRY, "r1_only")("none")).toBeCloseTo(value);
    expect(second("knight", pair, KNIGHT_PARRY, "none")("r1_only")).toBeCloseTo(value);
  });
});
