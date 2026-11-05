import { describe, expect, it } from "vitest";

import { displaySlots } from "./display";
import { indexDatabase } from "./engineData";
import { realDatabase } from "./realDatabase.testing";

const data = indexDatabase(realDatabase);

describe("displaySlots", () => {
  it("shows a rolled item and rule as themselves", () => {
    const shown = displaySlots(data, { rh: "uchigatana", rh_ash: "parry", rule_1: "parry_only" });
    expect(shown.rh).toEqual({ kind: "item", item: data.items.get("uchigatana") });
    expect(shown.rh_ash).toEqual({ kind: "item", item: data.items.get("parry") });
    expect(shown.rule_1).toEqual({ kind: "rule", rule: data.rules.get("parry_only") });
  });

  it("shows none for a rolled none and for an empty result alike", () => {
    const shown = displaySlots(data, { lh: "none", spell: null });
    expect(shown.lh).toEqual({ kind: "none" });
    expect(shown.spell).toEqual({ kind: "none" });
  });

  it("shows the rule None as a rule, not as an empty slot", () => {
    expect(displaySlots(data, { rule_1: "none" }).rule_1.kind).toBe("rule");
  });

  it("leaves the ash to the player on a hand that holds something", () => {
    expect(displaySlots(data, { rh: "uchigatana", rh_ash: null }).rh_ash).toEqual({ kind: "any" });
    const noAshRow = displaySlots(data, { rh: "astrologers_staff", lh: "brass_shield" });
    expect(noAshRow.rh_ash).toEqual({ kind: "any" });
    expect(noAshRow.lh_ash).toEqual({ kind: "any" });
  });

  it("shows none on the ash line of an empty hand", () => {
    const shown = displaySlots(data, { rh: "none", rh_ash: null, lh: null });
    expect(shown.rh_ash).toEqual({ kind: "none" });
    expect(shown.lh_ash).toEqual({ kind: "none" });
  });

  it("always shows talismans 3 and 4 as any", () => {
    const shown = displaySlots(data, {});
    expect(shown.talisman_3).toEqual({ kind: "any" });
    expect(shown.talisman_4).toEqual({ kind: "any" });
  });
});
