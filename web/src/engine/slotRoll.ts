import type { Modifier, PoolSlot } from "./database";
import { isReachable } from "./eligibility";
import { poolKey, type EngineData } from "./engineData";
import { activeModifiers, type RollState } from "./modifiers";
import { matchesOption, type Option } from "./selectors";

/** Returns a number from 0 up to, but not including, 1. Never `Math.random`: a seed must reproduce. */
export type Random = () => number;

export type OptionFilter = (option: Option) => boolean;

export interface WeightedOption {
  readonly option: Option;
  readonly weight: number;
  readonly modifiers: readonly Modifier[];
}

export interface SlotPoolResult {
  /** Options left after the structural filters, before modifiers can remove any. */
  readonly pool: number;
  /** In table order, holding only options that can still roll. */
  readonly options: readonly WeightedOption[];
}

export interface SlotRoll {
  readonly pool: number;
  /** `null` is an empty result. */
  readonly chosen: WeightedOption | null;
  readonly probability: number;
}

export interface RollContext {
  readonly data: EngineData;
  readonly state: RollState;
  /** Items with a location row that counts for this selection. */
  readonly counted: ReadonlySet<string>;
}

export function slotOptions(data: EngineData, build: string, slot: PoolSlot): readonly Option[] {
  const pool = data.pools.get(poolKey(build, slot));
  if (pool === undefined) return [];

  const items: Option[] = data.database.item.map((row) => ({ kind: "item", row }));
  const rules: Option[] = data.database.combat_rule.map((row) => ({ kind: "rule", row }));
  return [...items, ...rules].filter((option) =>
    pool.selectors.some((selector) => matchesOption(selector, option)),
  );
}

function canExist(option: Option, counted: ReadonlySet<string>): boolean {
  if (option.row.odds <= 0) return false;
  return option.kind !== "item" || isReachable(option.row, counted);
}

/** Filters run before odds, so a modifier can never bring back what they removed. */
export function weighOptions(
  context: RollContext,
  options: readonly Option[],
  filters: readonly OptionFilter[] = [],
): SlotPoolResult {
  const candidates = options.filter(
    (option) => canExist(option, context.counted) && filters.every((filter) => filter(option)),
  );
  const active = activeModifiers(context.data, context.state);
  const weighted = candidates
    .map((option) => {
      const modifiers = active.filter((row) => matchesOption(row.target, option));
      const weight = modifiers.reduce((product, row) => product * row.value, option.row.odds);
      return { option, weight, modifiers };
    })
    .filter((row) => row.weight > 0);
  return { pool: candidates.length, options: weighted };
}

export function sample(result: SlotPoolResult, random: Random): SlotRoll {
  const total = result.options.reduce((sum, row) => sum + row.weight, 0);
  let remaining = random() * total;
  for (const row of result.options) {
    remaining -= row.weight;
    if (remaining < 0) {
      return { pool: result.pool, chosen: row, probability: row.weight / total };
    }
  }
  const last = result.options.at(-1);
  return last === undefined
    ? { pool: result.pool, chosen: null, probability: 0 }
    : { pool: result.pool, chosen: last, probability: last.weight / total };
}

export function rollSlot(
  context: RollContext,
  slot: PoolSlot,
  random: Random,
  filters: readonly OptionFilter[] = [],
): SlotRoll {
  const options = slotOptions(context.data, context.state.build, slot);
  return sample(weighOptions(context, options, filters), random);
}
