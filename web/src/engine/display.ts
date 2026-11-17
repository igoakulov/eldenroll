import type { ArmorSet, CombatRule, Item, LoadoutSlot, PoolSlot } from "./database";
import type { EngineData } from "./engineData";

export const ARMOR_PIECES = ["head", "body", "arms", "legs"] as const;
export type ArmorPiece = (typeof ARMOR_PIECES)[number];

/** `none` and `any` are constants, never read from a data row, so a missing row can't break a card.
 * An alias shows its label; the rolled member stays alongside for the summary. */
export type SlotDisplay =
  | { readonly kind: "none" }
  | { readonly kind: "any" }
  | { readonly kind: "item"; readonly item: Item }
  | { readonly kind: "alias"; readonly label: string; readonly url: string | null; readonly item: Item }
  | { readonly kind: "rule"; readonly rule: CombatRule }
  | {
      readonly kind: "armor_set";
      readonly set: ArmorSet;
      readonly pieces: Readonly<Record<ArmorPiece, SlotDisplay>>;
    };

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
  "armor",
  "item",
  "rule_1",
  "rule_2",
] as const;
export type DisplaySlot = (typeof DISPLAY_SLOTS)[number];

/** Rolled ids by slot; `null` is an empty result, and an absent slot had no row to roll. */
export type RolledSlots = Readonly<Partial<Record<LoadoutSlot, string | null>>>;

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
  if (item === undefined || item.category === "none") return NONE;
  return itemShown(data, item);
}

function itemShown(data: EngineData, item: Item): SlotDisplay {
  const alias = item.alias === null ? undefined : data.aliases.get(item.alias);
  return alias === undefined ? { kind: "item", item } : { kind: "alias", label: alias.label, url: alias.url, item };
}

/** The ash slots, the only ones whose missing result shows `any`: the player picks the ash, unless the hand is
 * empty. */
function ash(data: EngineData, slots: RolledSlots, hand: PoolSlot, slot: PoolSlot): SlotDisplay {
  if (shown(data, slots, hand).kind === "none") return NONE;
  const result = shown(data, slots, slot);
  return result.kind === "none" ? ANY : result;
}

/** A slot the set lacks shows `any`, so the player wears what they like there. */
function armor(data: EngineData, slots: RolledSlots): SlotDisplay {
  const id = slots.armor;
  const set = id === null || id === undefined ? undefined : data.armorSets.get(id);
  if (set === undefined) return NONE;
  const pieces: Record<ArmorPiece, SlotDisplay> = { head: ANY, body: ANY, arms: ANY, legs: ANY };
  for (const pieceId of set.pieces) {
    const item = data.items.get(pieceId);
    const slot = ARMOR_PIECES.find((piece) => piece === item?.subcategory);
    if (item !== undefined && slot !== undefined) pieces[slot] = itemShown(data, item);
  }
  return { kind: "armor_set", set, pieces };
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
    armor: armor(data, slots),
    item: shown(data, slots, "item"),
    rule_1: shown(data, slots, "rule_1"),
    rule_2: shown(data, slots, "rule_2"),
  };
}
