import type { RolledSlots } from "../engine/display";
import { LOADOUT_ORDER } from "../engine/loadout";
import type { RerollTarget } from "../engine/run";

/** The reroll panel's stops left to right, in reverse roll order, each with the chip naming its target
 * (`web/src/engine/README.md#Rerolls`). A stop lights its own chip and every chip to its left. */
export const REROLL_STOPS: readonly { readonly target: RerollTarget; readonly chip: string }[] = [
  { target: "armor", chip: "Armor" },
  { target: "rule_1", chip: "Rules" },
  { target: "talisman_1", chip: "Talismans" },
  { target: "item", chip: "Item" },
  { target: "spell", chip: "Spell" },
  { target: "lh", chip: "Left hand" },
  { target: "rh", chip: "Right hand" },
  { target: "character_class", chip: "Class" },
  { target: "boss", chip: "Boss" },
];

export const OPENING_STOP = REROLL_STOPS.findIndex((stop) => stop.target === "character_class");

/** `reroll` changes nothing for a slot the class has no row for, so a stop rerolls from the first slot at or after
 * its target, in roll order, that the class has. Armor always rolls. */
export function rerollTarget(slots: RolledSlots, target: RerollTarget): RerollTarget {
  if (target === "boss" || target === "character_class") return target;
  return LOADOUT_ORDER.slice(LOADOUT_ORDER.indexOf(target)).find((slot) => slots[slot] !== undefined) ?? "armor";
}
