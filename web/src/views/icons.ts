import type { Item } from "../engine/database";
import type { ArmorPiece } from "../engine/display";

/** The icon file key for an item: its subcategory where icons are drawn per subcategory, else its category. */
export function iconKey(item: Item): string | null {
  switch (item.category) {
    case "weapon":
    case "shield":
    case "armor":
      return item.subcategory;
    case "consumable":
      return item.subcategory === "throwables" ? "throwables" : "pots";
    case "ash":
    case "sorcery":
    case "incantation":
    case "talisman":
    case "tool":
      return item.category;
    case "none":
      return null;
  }
}

/** Each class's typical loadout beside its name, from the Icons boards. A class missing here shows none. */
export const CHARACTER_CLASS_ICONS: Readonly<Record<string, readonly string[]>> = {
  knight: ["medium_shield", "straight_sword"],
  warrior_2h: ["colossal_sword"],
  warrior_dw: ["curved_sword", "curved_sword"],
  ranger: ["bow", "crossbow"],
  sorcerer: ["glintstone_staff", "sorcery"],
  pyromancer: ["sacred_seal", "incantation"],
  spellblade: ["straight_sword", "glintstone_staff", "sacred_seal"],
  jester: ["torch", "perfume_bottle"],
};

/** The dimmed icon on an empty slot's struck tile: what the slot usually holds. */
export const EMPTY_SLOT_ICONS = {
  lh: "medium_shield",
  rh: "straight_sword",
  spell: "sorcery",
  talisman: "talisman",
  item: "tool",
} as const;

export const ARMOR_PIECE_ICONS: Readonly<Record<ArmorPiece, string>> = {
  head: "head",
  body: "body",
  arms: "arms",
  legs: "legs",
};
