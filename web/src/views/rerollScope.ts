import { copy } from "../copy";
import type { RolledSlots } from "../engine/display";
import { LOADOUT_ORDER } from "../engine/loadout";
import type { RerollTarget } from "../engine/run";

/** The reroll panel's stops left to right, in reverse roll order, each with the chip naming its target
 * (`web/src/engine/README.md#Rerolls`). A stop lights its own chip and every chip to its left. */
export const REROLL_STOPS: readonly { readonly target: RerollTarget; readonly chip: string }[] = [
  { target: "armor", chip: copy.reroll.chips.armor },
  { target: "rule", chip: copy.reroll.chips.rule },
  { target: "talisman_1", chip: copy.reroll.chips.talismans },
  { target: "item", chip: copy.reroll.chips.item },
  { target: "spell", chip: copy.reroll.chips.spell },
  { target: "lh", chip: copy.reroll.chips.leftHand },
  { target: "rh", chip: copy.reroll.chips.rightHand },
  { target: "character_class", chip: copy.reroll.chips.characterClass },
  { target: "boss", chip: copy.reroll.chips.boss },
];

export const OPENING_STOP = REROLL_STOPS.findIndex((stop) => stop.target === "character_class");

/** `reroll` changes nothing for a slot the class has no row for, so a stop rerolls from the first slot at or after
 * its target, in roll order, that the class has. Armor always rolls. */
export function rerollTarget(slots: RolledSlots, target: RerollTarget): RerollTarget {
  if (target === "boss" || target === "character_class") return target;
  return LOADOUT_ORDER.slice(LOADOUT_ORDER.indexOf(target)).find((slot) => slots[slot] !== undefined) ?? "armor";
}
