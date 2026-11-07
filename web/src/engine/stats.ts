import type { Item, PoolSlot } from "./database";
import type { Option } from "./selectors";
import type { Stats } from "./settings";
import {
  slotOptions,
  weighOptions,
  type OptionFilter,
  type RollContext,
} from "./slotRoll";

const TWO_HANDED_STR_MULTIPLIER = 1.5;

export interface StatLimits {
  readonly stats: Stats;
  readonly maxStatGap: number;
}

export function statDeficit(item: Item, stats: Stats, twoHanded: boolean): number {
  const strength = twoHanded ? Math.floor(stats.str * TWO_HANDED_STR_MULTIPLIER) : stats.str;
  return (
    Math.max(0, item.str - strength) +
    Math.max(0, item.dex - stats.dex) +
    Math.max(0, item.int - stats.int) +
    Math.max(0, item.fth - stats.fth) +
    Math.max(0, item.arc - stats.arc)
  );
}

function withinGap(item: Item, limits: StatLimits, twoHanded: boolean): boolean {
  return statDeficit(item, limits.stats, twoHanded) <= limits.maxStatGap;
}

/** For a slot no hand's bonus can reach, such as a spell. */
export function plainStatFilter(limits: StatLimits): OptionFilter {
  return (option) => option.kind !== "item" || withinGap(option.row, limits, false);
}

/** RH rolled first, so LH reads it as it stands; an empty RH reads as nothing rolled. */
export function lhStatFilter(context: RollContext, limits: StatLimits): OptionFilter {
  const rh = context.state.rolled.get("rh");
  const rhEmpty = rh === null || rh === "none";
  return (option) =>
    option.kind !== "item" ||
    withinGap(option.row, limits, rhEmpty && option.row.str_bonus_2h === true);
}

/** LH hasn't rolled when RH does, so an RH option gets the bonus only if `none` is all LH could
 * roll beside it. The look-ahead is skipped unless the bonus decides the option. */
export function rhStatFilter(context: RollContext, limits: StatLimits): OptionFilter {
  return (option) => {
    if (option.kind !== "item") return true;
    const item = option.row;
    if (withinGap(item, limits, false)) return true;
    if (item.str_bonus_2h !== true || !withinGap(item, limits, true)) return false;
    return leavesLhEmpty(context, limits, item);
  };
}

function leavesLhEmpty(context: RollContext, limits: StatLimits, rh: Item): boolean {
  const rolled = new Map<PoolSlot, string | null>(context.state.rolled);
  rolled.set("rh", rh.id);
  const next: RollContext = { ...context, state: { ...context.state, rolled } };
  const options = slotOptions(next.data, next.state.characterClass, "lh");
  const notTheSameWeapon = (option: Option) => option.row.id === "none" || option.row.id !== rh.id;
  const result = weighOptions(next, options, {
    rules: [notTheSameWeapon],
    stats: lhStatFilter(next, limits),
  });
  return result.options.every((row) => row.option.row.id === "none");
}
