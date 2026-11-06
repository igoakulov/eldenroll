import { describe, expect, it } from "vitest";

import { displaySlots } from "./display";
import { indexDatabase } from "./engineData";
import { realDatabase } from "./realDatabase.testing";

const data = indexDatabase(realDatabase);

describe("displaySlots", () => {
  it("shows a rolled item and rule as themselves", () => {
    const shown = displaySlots(data, { rh: "uchigatana", rh_ash: "barbaric_roar", rule_1: "parry_only" });
    expect(shown.rh).toEqual({ kind: "item", item: data.items.get("uchigatana") });
    expect(shown.rh_ash).toEqual({ kind: "item", item: data.items.get("barbaric_roar") });
    expect(shown.rule_1).toEqual({ kind: "rule", rule: data.rules.get("parry_only") });
  });

  it("shows an alias member as its label, and keeps the member it rolled", () => {
    const shown = displaySlots(data, { rh: "astrologers_staff", lh: "brass_shield", lh_ash: "parry" });
    expect(shown.rh).toEqual({ kind: "alias", label: "Any staff", item: data.items.get("astrologers_staff") });
    expect(shown.lh.kind).toBe("item");
    expect(shown.lh_ash).toMatchObject({ kind: "alias", label: "Any parry ash" });
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

  it("shows the armor set with each piece in its slot, and any where the set has none", () => {
    const shown = displaySlots(data, { armor: "aristocrat_set" });
    expect(shown.armor).toEqual({
      kind: "armor_set",
      set: data.armorSets.get("aristocrat_set"),
      pieces: {
        head: { kind: "item", item: data.items.get("aristocrat_headband") },
        body: { kind: "item", item: data.items.get("aristocrat_garb") },
        arms: { kind: "any" },
        legs: { kind: "item", item: data.items.get("aristocrat_boots") },
      },
    });
    expect(displaySlots(data, { armor: null }).armor).toEqual({ kind: "none" });
  });

  it("always shows talismans 3 and 4 as any", () => {
    const shown = displaySlots(data, {});
    expect(shown.talisman_3).toEqual({ kind: "any" });
    expect(shown.talisman_4).toEqual({ kind: "any" });
  });
});
