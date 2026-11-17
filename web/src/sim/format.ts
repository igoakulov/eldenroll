import { className, NO_LOCATION, type FairLine, type ModifierText, type Sample, type ShareRow, type Trigger } from "../../sim/aggregate";
import { copy } from "../copy";
import type { TableFold } from "../ui/DataTable";

const words = copy.sim.synergies;

/** Every long table shows its first 10 rows and folds the rest behind `Show all`. */
export const FOLD: TableFold = { after: 10, showAll: copy.sim.showAll, showLess: copy.sim.showLess };

/** A share row's name as the page and `metrics.md` show it: a region numbered in play order, `No location` named. */
export function rowName(row: Pick<ShareRow, "key" | "name" | "order">): string {
  if (row.key === NO_LOCATION) return copy.sim.slots.noLocation;
  return row.order === undefined ? row.name : copy.sim.regionNumbered(row.order, row.name);
}

export function percent(share: number, digits = 1): string {
  return Number.isFinite(share) ? `${(share * 100).toFixed(digits)}%` : "–";
}

/** Showings per run, the unit a run is judged by: two decimals below 10, so a rare option still reads. */
export function perRun(value: number): string {
  return decimal(value, value < 10 ? 2 : 1);
}

/** Showings over a whole sample: one decimal below 10, since a fair share is rarely whole. */
export function showings(value: number): string {
  return decimal(value, Math.abs(value) < 10 ? 1 : 0);
}

/** A gap in showings, signed: above the fair share +, below it −. */
export function signedShowings(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${showings(Math.abs(value))}`;
}

/** The smallest round number at or above `top`, one significant digit: each chart's own scale. */
export function niceMax(top: number): number {
  if (top <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(top));
  return Math.ceil(top / step - 1e-9) * step;
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

/** A modifier in plain words: what must hold, and what it multiplies. */
export function modifierRule(modifier: ModifierText): { readonly when: string; readonly target: string } {
  const when = modifier.when.length === 0 ? words.always : modifier.when.map(trigger).join(words.and);
  return { when, target: words.target(words.list(modifier.target)) };
}

/** Whether a name matches the search: every word of it, anywhere, any case. */
export function matches(name: string, search: string): boolean {
  const text = name.toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

/** A Furthest from fair line's class, or how many classes it sums. */
export function lineClasses(sample: Sample, line: FairLine): string {
  return line.classes.length === 1
    ? className(sample.data, line.classes[0]!)
    : copy.sim.slots.classesTogether(line.classes.length, line.others === true);
}
