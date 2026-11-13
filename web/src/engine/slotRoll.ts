import type { LoadoutSlot, Modifier } from "./database";
import { isSetReachable } from "./eligibility";
import { poolKey, type EngineData } from "./engineData";
import { decayRate, lateBoost, type DecayParams, type LateOffsetParams } from "./hyperparams";
import { activeModifiers, type RollState } from "./modifiers";
import { pickWeighted } from "./random";
import { matchesOption, type Option } from "./selectors";

/** Returns a number from 0 up to, but not including, 1. Never `Math.random`: a seed must reproduce. */
export type Random = () => number;

export type OptionFilter = (option: Option) => boolean;

/** Game rules always hold; the stat filter follows the player's inputs. */
export interface PoolFilters {
  readonly rules?: readonly OptionFilter[];
  readonly stats?: OptionFilter;
}

export interface WeightedOption {
  readonly option: Option;
  readonly weight: number;
  readonly modifiers: readonly Modifier[];
  /** The decay multiplier in `weight`: 1 for an option never shown. */
  readonly decay: number;
  /** The lateness and stat-requirement boost in `weight` (`lateBoost`): 1 for anything but an item. */
  readonly late: number;
}

export interface SlotPoolResult {
  /** Options that can still roll. */
  readonly pool: number;
  /** In table order, holding only options that can still roll. */
  readonly options: readonly WeightedOption[];
}

export interface SlotRoll {
  readonly pool: number;
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
  /** `EngineData.decayGroupSize`; a missing key decays as a pool of 1. */
  readonly decayGroupSize: ReadonlyMap<string, number>;
  readonly decay: DecayParams;
}

const NO_DECAY: DecayParams = { max: 1, min: 1, halfSize: 1 };

export const NO_REPETITION: Repetition = { seen: {}, decayGroupSize: new Map(), decay: NO_DECAY };

/** Compounds: each completed objective that showed it multiplies again, at a rate its pool's
 * size sets (`data/balance.md#Hyperparameters`). */
export function repetitionMultiplier(key: string, repetition: Repetition): number {
  const rate = decayRate(repetition.decayGroupSize.get(key) ?? 1, repetition.decay);
  return rate ** (repetition.seen[key] ?? 0);
}

export interface RollContext {
  readonly data: EngineData;
  readonly state: RollState;
  /** Items with a location row that counts for this selection. */
  readonly counted: ReadonlySet<string>;
  /** `optionKey`s the player excluded; they win over every other input. */
  readonly neverRoll?: ReadonlySet<string>;
  readonly repetition?: Repetition;
  /** Absent means no boost: most tests roll a pool in isolation and don't need one. */
  readonly lateOffset?: LateOffsetParams;
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

function reachable(option: Option, counted: ReadonlySet<string>): boolean {
  if (option.kind === "item") return counted.has(option.row.id);
  if (option.kind === "armor_set") return isSetReachable(option.row, counted);
  return true;
}

function allowed(option: Option, context: RollContext, filters: PoolFilters): boolean {
  return (
    option.row.odds > 0 &&
    (filters.rules ?? []).every((filter) => filter(option)) &&
    !(context.neverRoll?.has(optionKey(option)) ?? false) &&
    reachable(option, context.counted) &&
    (filters.stats === undefined || filters.stats(option))
  );
}

/** Filters run before odds, so a modifier can never bring back what they removed. */
export function weighOptions(
  context: RollContext,
  options: readonly Option[],
  filters: PoolFilters = {},
): SlotPoolResult {
  const candidates = options.filter((option) => allowed(option, context, filters));
  const active = activeModifiers(context.data, context.state);
  const repetition = context.repetition ?? NO_REPETITION;
  const lateOffset = context.lateOffset;
  const weighted = candidates
    .map((option) => {
      const modifiers = active.filter((row) => matchesOption(row.target, option));
      const late =
        lateOffset === undefined || option.kind !== "item"
          ? 1
          : lateBoost(
              context.data.lateOffset.get(option.row.id)?.lateness ?? 0,
              context.data.lateOffset.get(option.row.id)?.demand ?? 0,
              lateOffset,
            );
      const decay = repetitionMultiplier(repeatKey(option), repetition);
      const weight = modifiers.reduce((product, row) => product * row.value, option.row.odds * decay * late);
      return { option, weight, modifiers, decay, late };
    });
  const kept = weighted.filter((row) => row.weight > 0);
  return { pool: kept.length, options: kept };
}

export function sample(result: SlotPoolResult, random: Random): SlotRoll {
  const total = result.options.reduce((sum, row) => sum + row.weight, 0);
  const picked = pickWeighted(
    result.options.map((row) => ({ value: row, weight: row.weight })),
    random,
  );
  const shared = {
    pool: result.pool,
    fromShortlist: false,
    options: result.options,
  };
  return picked === null
    ? { ...shared, chosen: null, probability: 0 }
    : { ...shared, chosen: picked.value, probability: picked.weight / total };
}
