import type { ModifierText, Trigger } from "../../sim/aggregate";
import { copy } from "../copy";
import type { TableFold } from "../ui/DataTable";

const words = copy.simulate.boosts;

/** Every long table shows its first 10 rows and folds the rest behind `Show all`. */
export const FOLD: TableFold = { after: 10, showAll: copy.simulate.showAll, showLess: copy.simulate.showLess };

export function percent(share: number, digits = 1): string {
  return Number.isFinite(share) ? `${(share * 100).toFixed(digits)}%` : "–";
}

export function decimal(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "–";
}

/** A multiplier: two decimals below 10, whole numbers above, since the catch-up boost reaches tens of thousands. */
export function multiplier(value: number): string {
  if (!Number.isFinite(value)) return "–";
  return value < 10 ? value.toFixed(2) : Math.round(value).toLocaleString("en-GB");
}

function trigger(one: Trigger): string {
  if (one.kind === "classes") return words.list(one.names);
  if (one.slots.includes("boss")) return (one.negated ? words.notBoss : words.boss)(words.list(one.names));
  const slots = [...new Set(one.slots.flatMap((slot) => (slot === "boss" ? [] : [words.slots[slot]])))].join(words.or);
  return (one.negated ? words.notRolled : words.rolled)(words.list(one.names), slots);
}

/** A modifier in plain words: what must hold, what it multiplies and by how much. */
export function modifierSentence(modifier: ModifierText): string {
  const when = modifier.when.length === 0 ? words.always : modifier.when.map(trigger).join(words.and);
  return words.modifier(when, words.list(modifier.target), modifier.value.toLocaleString("en-GB"));
}

/** Whether a name matches the search: every word of it, anywhere, any case. */
export function matches(name: string, search: string): boolean {
  const text = name.toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
