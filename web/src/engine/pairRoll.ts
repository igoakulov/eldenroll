import { isNone, type Modifier, type PoolSlot } from "./database";
import type { EngineData } from "./engineData";
import { modifierHolds, type RollState } from "./modifiers";
import { pickWeighted } from "./random";
import { matchesOption, type Option } from "./selectors";
import type { Random, SlotPoolResult, SlotRoll, WeightedOption } from "./slotRoll";

/** Slots that roll together as one draw over pairs of options (`data/balance.md#Paired slots`), by first
 * slot. */
export const PAIRED: ReadonlyMap<PoolSlot, PoolSlot> = new Map<PoolSlot, PoolSlot>([
  ["talisman_1", "talisman_2"],
]);

/** Weighs pairs of options: a row whose condition names a slot of the pair reads the other slot of the pair, both
 * ways, and applies once to a pair. */
interface PairWeigher {
  readonly applied: (first: Option, second: Option) => readonly Modifier[];
  /** The pair's weight from its two options' weights alone. */
  readonly weight: (first: WeightedOption, second: WeightedOption) => number;
}

/** What catch-up does to an option a rule above ×1 is active on (`CatchUp.boosted`); none means no catch-up. */
export type Boosted = ((caughtUp: number) => number) | undefined;

function pairWeigher(
  data: EngineData,
  state: RollState,
  first: PoolSlot,
  second: PoolSlot,
  options: readonly Option[],
  boosted: Boosted,
): PairWeigher {
  const rows = data.database.modifier.filter((row) =>
    row.when.some((condition) => condition.kind === "rolled" && condition.slots.some((slot) => slot === first || slot === second)),
  );
  // Which options satisfy each row's conditions when they stand in the other slot of the pair
  const asPartner = new Map<string, Set<Modifier>>();
  for (const option of options) {
    if (asPartner.has(option.row.id)) continue;
    const rolled = new Map(state.rolled);
    rolled.set(first, option.row.id);
    rolled.set(second, option.row.id);
    const partnerState: RollState = { ...state, rolled };
    asPartner.set(option.row.id, new Set(rows.filter((row) => modifierHolds(data, partnerState, row))));
  }
  const applied = (one: Option, other: Option) =>
    rows.filter(
      (row) =>
        (asPartner.get(one.row.id)?.has(row) === true && matchesOption(row.target, other)) ||
        (asPartner.get(other.row.id)?.has(row) === true && matchesOption(row.target, one)),
    );
  const lifts = (rows: readonly Modifier[], option: Option) => rows.some((row) => row.value > 1 && matchesOption(row.target, option));
  // A row above ×1 keeps its target at base odds or more whatever catch-up says, as within one slot
  const lifted = (row: WeightedOption, rows: readonly Modifier[]) =>
    boosted !== undefined && lifts(rows, row.option) ? row.plain * boosted(row.catchUp) : row.weight;
  return {
    applied,
    weight: (one, other) => {
      const rows = applied(one.option, other.option);
      return rows.reduce((product, row) => product * row.value, lifted(one, rows) * lifted(other, rows));
    },
  };
}

/** An empty slot may follow another; anything else shows once in a pair. */
function canPair(first: Option, second: Option): boolean {
  return first.row.id !== second.row.id || isNone(first.row.id);
}

function rollOf(result: SlotPoolResult, options: readonly WeightedOption[], chosen: WeightedOption | null, total: number): SlotRoll {
  return {
    pool: result.pool,
    chosen,
    probability: chosen === null || total <= 0 ? 0 : chosen.weight / total,
    fromShortlist: false,
    options,
    tally: result.tally,
  };
}

function withPartner(row: WeightedOption, weight: number, rules: readonly Modifier[]): WeightedOption {
  return {
    ...row,
    weight,
    plain: row.weight > 0 ? (row.plain * weight) / row.weight : 0,
    modifiers: [...row.modifiers, ...rules.filter((rule) => !row.modifiers.includes(rule))],
  };
}

/** The second slot given the first's result, the pair rows read both ways. */
function secondOptions(weigher: PairWeigher, second: SlotPoolResult, taken: WeightedOption | null): WeightedOption[] {
  return second.options.map((row) => {
    if (taken === null) return row;
    if (!canPair(taken.option, row.option)) return withPartner(row, 0, []);
    // The pair weights, the first slot's share the same in every one
    return withPartner(row, weigher.weight(taken, row), weigher.applied(taken.option, row.option));
  });
}

function rollSecond(
  weigher: PairWeigher,
  second: SlotPoolResult,
  taken: WeightedOption | null,
  random: Random,
): SlotRoll {
  const options = secondOptions(weigher, second, taken);
  const total = options.reduce((sum, row) => sum + row.weight, 0);
  const picked = pickWeighted(options.map((row) => ({ value: row, weight: row.weight })), random);
  return rollOf(second, options, picked?.value ?? null, total);
}

/** Rolls both slots of a pair as one draw over ordered pairs of options: a pair weighs its two options' weights
 * times the rows that link them, so a pairing works whichever slot either option would land in. `first` and
 * `second` are each slot's pool weighed alone, with no row that reads the pair. */
export function rollPair(
  data: EngineData,
  state: RollState,
  slots: readonly [PoolSlot, PoolSlot],
  first: SlotPoolResult,
  second: SlotPoolResult,
  random: Random,
  boosted: Boosted,
): readonly [SlotRoll, SlotRoll] {
  const weigher = pairWeigher(data, state, slots[0], slots[1], [...first.options, ...second.options].map((row) => row.option), boosted);
  const pairs: { readonly value: readonly [WeightedOption, WeightedOption]; readonly weight: number }[] = [];
  const marginal = new Map<WeightedOption, number>();
  for (const one of first.options) {
    let sum = 0;
    if (one.plain > 0) {
      for (const two of second.options) {
        if (two.plain <= 0 || !canPair(one.option, two.option)) continue;
        const weight = weigher.weight(one, two);
        if (weight <= 0) continue;
        pairs.push({ value: [one, two], weight });
        sum += weight;
      }
    }
    marginal.set(one, sum);
  }
  const picked = pickWeighted(pairs, random);
  if (picked === null) {
    // No two options can stand together: the first slot rolls alone, and the second takes what is left
    const alone = pickWeighted(first.options.map((row) => ({ value: row, weight: row.weight })), random)?.value ?? null;
    const total = first.options.reduce((sum, row) => sum + row.weight, 0);
    return [rollOf(first, first.options, alone, total), rollSecond(weigher, second, alone, random)];
  }
  const [chosenFirst, chosenSecond] = picked.value;
  const linking = weigher.applied(chosenFirst.option, chosenSecond.option);
  const firstOptions = first.options.map((row) =>
    withPartner(row, marginal.get(row) ?? 0, row === chosenFirst ? linking : []),
  );
  const total = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const secondRoll = (() => {
    const options = secondOptions(weigher, second, chosenFirst);
    const chosen = options[second.options.indexOf(chosenSecond)] ?? null;
    return rollOf(second, options, chosen, options.reduce((sum, row) => sum + row.weight, 0));
  })();
  return [rollOf(first, firstOptions, firstOptions[first.options.indexOf(chosenFirst)] ?? null, total), secondRoll];
}

/** The second slot alone, when the first is kept: the same pair rows, read from the kept result. */
export function rollSecondOfPair(
  data: EngineData,
  state: RollState,
  slots: readonly [PoolSlot, PoolSlot],
  second: SlotPoolResult,
  taken: Option | null,
  random: Random,
  boosted: Boosted,
): SlotRoll {
  const weigher = pairWeigher(data, state, slots[0], slots[1], [...second.options.map((row) => row.option), ...(taken ? [taken] : [])], boosted);
  const takenRow: WeightedOption | null =
    taken === null ? null : { option: taken, weight: 1, modifiers: [], catchUp: 1, plain: 1 };
  return rollSecond(weigher, second, takenRow, random);
}
