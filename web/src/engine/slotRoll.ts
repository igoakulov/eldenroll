import { isNone, type LoadoutSlot, type Modifier } from "./database";
import { isSetReachable } from "./eligibility";
import { poolKey, type EngineData } from "./engineData";
import { DEFAULT_HYPERPARAMS, type CatchUp, type FixedShare } from "./hyperparams";
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
  /** What catch-up multiplies the option's odds by in `weight` (`Hyperparams.catchUp`); 1 on anything without a
   * location. */
  readonly catchUp: number;
  /** `weight` without catch-up: odds, modifiers and the fixed share's scale (`Hyperparams.fixedShare`). */
  readonly plain: number;
}

/** What a roll adds to the run's tally: each option with a location's chance in it, rules left out, by `tallyKey`. */
export type TallyAdded = Readonly<Record<string, number>>;

export interface SlotPoolResult {
  /** Options past the filters and removals; catch-up may weigh some at 0 this roll. */
  readonly pool: number;
  /** In table order, holding only the options `pool` counts. */
  readonly options: readonly WeightedOption[];
  readonly tally: TallyAdded;
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
  readonly tally: TallyAdded;
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
  /** Absent means no catch-up: most tests roll a pool in isolation and don't need one. */
  readonly catchUp?: CatchUp;
  /** Absent means the default (`DEFAULT_HYPERPARAMS`). */
  readonly fixedShare?: FixedShare;
  /** The chance each option has had so far (`Run.tally` and this objective's earlier slots), by `tallyKey`, and the
   * scope this roll's options are tallied under (`tallyScope`). */
  readonly tally?: { readonly had: Readonly<Record<string, number>>; readonly scope: string };
  /** The share of the run's bosses still alive, for the runway ceiling (`CatchUp.ceiling`); absent, no ceiling. */
  readonly left?: number;
}

/** Slots that share one tally: a second slot of a kind counts with the first. */
export type TallyGroup = "rh" | "rh_ash" | "lh" | "spell" | "item" | "talisman_1" | "rule" | "armor";

const TALLY_GROUP: Readonly<Record<LoadoutSlot, TallyGroup>> = {
  rh: "rh",
  rh_ash: "rh_ash",
  lh: "lh",
  lh_ash: "rh_ash",
  spell: "spell",
  item: "item",
  talisman_1: "talisman_1",
  talisman_2: "talisman_1",
  rule: "rule",
  armor: "armor",
};

/** Whose rolls a slot's tally counts: one class's for `CatchUp.perCharacterClass`, every class's for the rest. */
export function tallyScope(catchUp: CatchUp, characterClass: string, slot: LoadoutSlot): string {
  const group = TALLY_GROUP[slot];
  return `${catchUp.perCharacterClass.includes(group) ? characterClass : "*"}|${group}`;
}

export function tallyKey(scope: string, option: Option): string {
  return `${scope}|${optionKey(option)}`;
}

/** Adds tallies together, as a run does after each roll it keeps. */
export function addTally(...tallies: readonly TallyAdded[]): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const tally of tallies) for (const [key, value] of Object.entries(tally)) sum[key] = (sum[key] ?? 0) + value;
  return sum;
}

/** Whether catch-up moves chance to or from an option: an item with a location row, or a set with a piece that has
 * one. */
function located(data: EngineData, option: Option): boolean {
  if (option.kind === "item") return !data.foundEverywhere.has(option.row.id);
  if (option.kind === "armor_set") return option.row.pieces.some((piece) => !data.foundEverywhere.has(piece));
  return false;
}

/** Whether an option holds a fixed share of its roll whatever else is in it (`data/balance.md#Fixed shares`): `none`,
 * the consumables and the rest found everywhere, a set with no piece that has a location, and in the rule slot `None`,
 * since no rule has a location. */
function holdsFixedShare(data: EngineData, option: Option): boolean {
  return option.kind === "rule" ? isNone(option.row.id) : !located(data, option);
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

function reachable(data: EngineData, option: Option, counted: ReadonlySet<string>): boolean {
  if (option.kind === "item") return counted.has(option.row.id);
  if (option.kind === "armor_set") return isSetReachable(data, option.row, counted);
  return true;
}

function allowed(option: Option, context: RollContext, filters: PoolFilters): boolean {
  return (
    option.row.odds > 0 &&
    (filters.rules ?? []).every((filter) => filter(option)) &&
    !(context.neverRoll?.has(optionKey(option)) ?? false) &&
    reachable(context.data, option, context.counted) &&
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
  const kept = candidates
    .map((option) => {
      const modifiers = active.filter((row) => matchesOption(row.target, option));
      const plain = modifiers.reduce((product, row) => product * row.value, option.row.odds);
      return { option, modifiers, plain, located: located(context.data, option) };
    })
    .filter((row) => row.plain > 0);
  const { catchUp, tally } = context;
  const fixedShare = context.fixedShare ?? DEFAULT_HYPERPARAMS.fixedShare;
  const sum = (rows: readonly (typeof kept)[number][]) => rows.reduce((total, row) => total + row.option.row.odds, 0);
  // The rest of the pool, everything but the fixed shares, weighs `rest` at base odds against the fixed shares' odds
  const restRows = kept.filter((row) => !holdsFixedShare(context.data, row.option));
  const restOdds = sum(restRows);
  const rest = fixedShare.restWeight(1);
  const restOfRoll = rest / (rest + sum(kept.filter((row) => holdsFixedShare(context.data, row.option))));
  const multipliers = new Map<Option, number>();
  const added: Record<string, number> = {};
  const locatedRows = restRows.filter((row) => row.located);
  if (catchUp !== undefined && tally !== undefined && locatedRows.length > 0) {
    // Catch-up moves chance only among options with a location; chances are of the whole roll, as the tally counts
    const keys = locatedRows.map((row) => tallyKey(tally.scope, row.option));
    const chances = catchUp.even(
      locatedRows.map((row, index) => {
        const odds = row.option.row.odds;
        const had = tally.had[keys[index]!] ?? 0;
        if (context.left === undefined) return { odds, had };
        // The tally also keeps the share of the run left when the option first could roll, for its ceiling
        const arrival = `${keys[index]!}#left`;
        if (tally.had[arrival] === undefined) added[arrival] = context.left;
        return { odds, had, ceiling: catchUp.ceiling(tally.had[arrival] ?? context.left) };
      }),
      (restOfRoll * sum(locatedRows)) / restOdds,
    );
    locatedRows.forEach((row, index) => {
      const chance = chances[index] ?? 0;
      const caughtUp = (chance / restOfRoll) * (restOdds / row.option.row.odds);
      multipliers.set(row.option, row.modifiers.some((modifier) => modifier.value > 1) ? catchUp.boosted(caughtUp) : caughtUp);
      added[keys[index]!] = chance;
    });
  }
  const weighted = kept.map(({ option, modifiers, plain }) => {
    const scale = restRows.length === 0 || holdsFixedShare(context.data, option) ? 1 : fixedShare.restWeight(1 / restOdds);
    const multiplier = multipliers.get(option) ?? 1;
    return { option, weight: plain * scale * multiplier, modifiers, catchUp: multiplier, plain: plain * scale };
  });
  return { pool: weighted.length, options: weighted, tally: added };
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
    tally: result.tally,
  };
  return picked === null
    ? { ...shared, chosen: null, probability: 0 }
    : { ...shared, chosen: picked.value, probability: picked.weight / total };
}
