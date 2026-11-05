import type { CombatRule, Item, PoolSlot } from "./database";
import type { EngineData } from "./engineData";

export const NONE_LABEL = "none";
export const ANY_LABEL = "any";

/** Labels are constants, never read from a data row, so a missing row can't break a card. */
export type SlotDisplay =
  | { readonly kind: "none" }
  | { readonly kind: "any" }
  | { readonly kind: "item"; readonly item: Item }
  | { readonly kind: "rule"; readonly rule: CombatRule };

export const DISPLAY_SLOTS = [
  "rh",
  "rh_ash",
  "lh",
  "lh_ash",
  "spell",
  "talisman_1",
  "talisman_2",
  "talisman_3",
  "talisman_4",
  "item",
  "rule_1",
  "rule_2",
] as const;
export type DisplaySlot = (typeof DISPLAY_SLOTS)[number];

/** Rolled ids by slot; `null` is an empty result, and an absent slot had no row to roll. */
export type RolledSlots = Readonly<Partial<Record<PoolSlot, string | null>>>;

const NONE: SlotDisplay = { kind: "none" };
const ANY: SlotDisplay = { kind: "any" };

function shown(data: EngineData, slots: RolledSlots, slot: PoolSlot): SlotDisplay {
  const id = slots[slot];
  if (id === null || id === undefined) return NONE;
  if (slot === "rule_1" || slot === "rule_2") {
    const rule = data.rules.get(id);
    return rule === undefined ? NONE : { kind: "rule", rule };
  }
  const item = data.items.get(id);
  return item === undefined || item.category === "none" ? NONE : { kind: "item", item };
}

/** The one slot whose missing result shows `any`: the player picks the ash, unless the hand is
 * empty. */
function ash(data: EngineData, slots: RolledSlots, hand: PoolSlot, slot: PoolSlot): SlotDisplay {
  if (shown(data, slots, hand).kind === "none") return NONE;
  const result = shown(data, slots, slot);
  return result.kind === "none" ? ANY : result;
}

export function displaySlots(
  data: EngineData,
  slots: RolledSlots,
): Readonly<Record<DisplaySlot, SlotDisplay>> {
  return {
    rh: shown(data, slots, "rh"),
    rh_ash: ash(data, slots, "rh", "rh_ash"),
    lh: shown(data, slots, "lh"),
    lh_ash: ash(data, slots, "lh", "lh_ash"),
    spell: shown(data, slots, "spell"),
    talisman_1: shown(data, slots, "talisman_1"),
    talisman_2: shown(data, slots, "talisman_2"),
    talisman_3: ANY,
    talisman_4: ANY,
    item: shown(data, slots, "item"),
    rule_1: shown(data, slots, "rule_1"),
    rule_2: shown(data, slots, "rule_2"),
  };
}
