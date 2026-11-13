import type { LoadoutSlot, Modifier } from "./database";
import { isSetReachable } from "./eligibility";
import { poolKey, type EngineData } from "./engineData";
import { activeModifiers, type RollState } from "./modifiers";
import { pickWeighted } from "./random";
import { matchesOption, type Option } from "./selectors";

/** Returns a number from 0 up to, but not including, 1. Never `Math.random`: a seed must reproduce. */
export type Random = () => number;

export type OptionFilter = (option: Option) => boolean;

/** Game rules always hold and are never traced; the stat filter follows the player's inputs. */
export interface PoolFilters {
  readonly rules?: readonly OptionFilter[];
  readonly stats?: OptionFilter;
}

/** What the player's inputs and the modifiers took out of a pool, each option counted under the
 * first it fails. */
export interface Removed {
  readonly neverRoll: number;
  readonly notInRegion: number;
  readonly bossStillAlive: number;
  readonly statReq: number;
  /** By modifier id, in table order; an option two `x0` rows hit counts under the first. */
  readonly byModifier: readonly (readonly [string, number])[];
}

export const NOTHING_REMOVED: Removed = {
  neverRoll: 0,
  notInRegion: 0,
  bossStillAlive: 0,
  statReq: 0,
  byModifier: [],
};

export interface WeightedOption {
  readonly option: Option;
  readonly weight: number;
  readonly modifiers: readonly Modifier[];
}

export interface SlotPoolResult {
  /** Options the game rules allow, before the player's inputs and the modifiers remove any. */
  readonly total: number;
  /** Options that can still roll. */
  readonly pool: number;
  readonly removed: Removed;
  /** In table order, holding only options that can still roll. */
  readonly options: readonly WeightedOption[];
}

export interface SlotRoll {
  readonly total: number;
  readonly pool: number;
  readonly removed: Removed;
  /** `null` is an empty result. */
  readonly chosen: WeightedOption | null;
  readonly probability: number;
  /** Rolled from the `Weapon shortlist` rather than the usual pool. */
  readonly fromShortlist: boolean;
  /** The pool it was drawn from, so the simulation can read every option's chance. */
  readonly options: readonly WeightedOption[];
}

/** Sees every slot roll, discarded ones included; the simulation's only way in. */
export type RollObserver = (slot: LoadoutSlot, roll: SlotRoll) => void;

export interface Repetition {
  /** How many completed objectives showed each `repeatKey` this run. */
  readonly seen: Readonly<Record<string, number>>;
  readonly decay: number;
}

export const NO_REPETITION: Repetition = { seen: {}, decay: 1 };

/** Compounds: each completed objective that showed it multiplies again. */
export function repetitionMultiplier(key: string, repetition: Repetition): number {
  return repetition.decay ** (repetition.seen[key] ?? 0);
}

export interface RollContext {
  readonly data: EngineData;
  readonly state: RollState;
  /** Items with a location row that counts for this selection. */
  readonly counted: ReadonlySet<string>;
  /** Items that would count if every boss were dead, which tells a living boss from a region. */
  readonly countedIfBossesDead?: ReadonlySet<string>;
  /** `optionKey`s the player excluded; they win over every other input. */
  readonly neverRoll?: ReadonlySet<string>;
  readonly repetition?: Repetition;
}

export function optionKey(option: Option): string {
  return `${option.kind}:${option.row.id}`;
}

/** An alias member repeats as its alias, so one seen member makes every member less likely.
 * `Never roll` still keys on `optionKey`, because the player picks real items. */
export function repeatKey(option: Option): string {
  if (option.kind === "item" && option.row.alias !== null) return `alias:${option.row.alias}`;
  return optionKey(option);
}

export function slotOptions(data: EngineData, characterClass: string, slot: LoadoutSlot): readonly Option[] {
  if (slot === "armor") return data.database.armor_set.map((row) => ({ kind: "armor_set", row }));
  const pool = data.pools.get(poolKey(characterClass, slot));
  if (pool === undefined) return [];

  const items: Option[] = data.database.item.map((row) => ({ kind: "item", row }));
  const rules: Option[] = data.database.combat_rule.map((row) => ({ kind: "rule", row }));
  return [...items, ...rules].filter((option) =>
    pool.selectors.some((selector) => matchesOption(selector, option)),
  );
}

type Verdict = "keep" | "rule" | Exclude<keyof Removed, "byModifier">;

function reachable(option: Option, counted: ReadonlySet<string>): boolean {
  if (option.kind === "item") return counted.has(option.row.id);
  if (option.kind === "armor_set") return isSetReachable(option.row, counted);
  return true;
}

function verdict(option: Option, context: RollContext, filters: PoolFilters): Verdict {
  if (option.row.odds <= 0) return "rule";
  if (!(filters.rules ?? []).every((filter) => filter(option))) return "rule";
  if (context.neverRoll?.has(optionKey(option))) return "neverRoll";
  if (!reachable(option, context.counted)) {
    const ifDead = context.countedIfBossesDead;
    return ifDead !== undefined && reachable(option, ifDead) ? "bossStillAlive" : "notInRegion";
  }
  if (filters.stats !== undefined && !filters.stats(option)) return "statReq";
  return "keep";
}

/** Filters run before odds, so a modifier can never bring back what they removed. */
export function weighOptions(
  context: RollContext,
  options: readonly Option[],
  filters: PoolFilters = {},
): SlotPoolResult {
  const removed = { neverRoll: 0, notInRegion: 0, bossStillAlive: 0, statReq: 0 };
  const candidates: Option[] = [];
  let total = 0;
  for (const option of options) {
    const result = verdict(option, context, filters);
    if (result === "rule") continue;
    total += 1;
    if (result === "keep") candidates.push(option);
    else removed[result] += 1;
  }
  const active = activeModifiers(context.data, context.state);
  const repetition = context.repetition ?? NO_REPETITION;
  const weighted = candidates
    .map((option) => {
      const modifiers = active.filter((row) => matchesOption(row.target, option));
      const base = option.row.odds * repetitionMultiplier(repeatKey(option), repetition);
      const weight = modifiers.reduce((product, row) => product * row.value, base);
      return { option, weight, modifiers };
    });
  const kept = weighted.filter((row) => row.weight > 0);
  const byModifier = new Map<string, number>();
  for (const row of weighted) {
    if (row.weight > 0) continue;
    const zero = row.modifiers.find((modifier) => modifier.value === 0);
    if (zero !== undefined) byModifier.set(zero.id, (byModifier.get(zero.id) ?? 0) + 1);
  }
  const order = active.map((row) => row.id);
  const counts = [...byModifier].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  return { total, pool: kept.length, removed: { ...removed, byModifier: counts }, options: kept };
}

export function sample(result: SlotPoolResult, random: Random): SlotRoll {
  const total = result.options.reduce((sum, row) => sum + row.weight, 0);
  const picked = pickWeighted(
    result.options.map((row) => ({ value: row, weight: row.weight })),
    random,
  );
  const shared = {
    total: result.total,
    pool: result.pool,
    removed: result.removed,
    fromShortlist: false,
    options: result.options,
  };
  return picked === null
    ? { ...shared, chosen: null, probability: 0 }
    : { ...shared, chosen: picked.value, probability: picked.weight / total };
}
