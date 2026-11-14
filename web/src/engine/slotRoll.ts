import type { LoadoutSlot, Modifier } from "./database";
import { isSetReachable } from "./eligibility";
import { poolKey, type EngineData } from "./engineData";
import { catchUpBoost, type CatchUpParams } from "./hyperparams";
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
  /** The catch-up boost in `weight` (`catchUpBoost`), on items and armor sets; 1 on anything else. */
  readonly catchUp: number;
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

export interface RollContext {
  readonly data: EngineData;
  readonly state: RollState;
  /** Items with a location row that counts for this selection. */
  readonly counted: ReadonlySet<string>;
  /** `optionKey`s the player excluded; they win over every other input. */
  readonly neverRoll?: ReadonlySet<string>;
  /** Absent means no boost: most tests roll a pool in isolation and don't need one. */
  readonly catchUp?: CatchUpParams;
  /** `Run.availableSince`; absent means every option takes its ceiling, `EngineData.runLeft`. */
  readonly availableSince?: Readonly<Record<string, number>>;
}

/** The catch-up boost on one option, as `WeightedOption.catchUp` holds it. */
export function catchUpMultiplier(
  data: EngineData,
  option: Option,
  catchUp: CatchUpParams | undefined,
  availableSince?: Readonly<Record<string, number>>,
): number {
  const key = optionKey(option);
  const ceiling = data.runLeft.get(key);
  if (catchUp === undefined || ceiling === undefined) return 1;
  // An option the run doesn't track, such as a shortlisted weapon out of reach, gets no boost
  const left = availableSince === undefined ? ceiling : Math.max(ceiling, availableSince[key] ?? 1);
  return catchUpBoost(left, catchUp);
}

export function optionKey(option: Option): string {
  return `${option.kind}:${option.row.id}`;
}

/** An alias member counts as its alias wherever showings are tallied, since the player sees the alias.
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
  const weighted = candidates.map((option) => {
    const modifiers = active.filter((row) => matchesOption(row.target, option));
    const catchUp = catchUpMultiplier(context.data, option, context.catchUp, context.availableSince);
    const weight = modifiers.reduce((product, row) => product * row.value, option.row.odds * catchUp);
    return { option, weight, modifiers, catchUp };
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
