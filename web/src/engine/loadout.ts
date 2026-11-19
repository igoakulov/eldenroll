import { isNone, type Item, type LoadoutSlot, type PoolSlot } from "./database";
import { poolKey, type EngineData } from "./engineData";
import type { CatchUp, FixedShare } from "./hyperparams";
import type { RollState } from "./modifiers";
import { PAIRED, rollPair, rollSecondOfPair } from "./pairRoll";
import {
  addTally,
  sample,
  slotOptions,
  tallyScope,
  weighOptions,
  type OptionFilter,
  type PoolFilters,
  type Random,
  type RollContext,
  type RollObserver,
  type SlotPoolResult,
  type SlotRoll,
  type TallyAdded,
} from "./slotRoll";
import { lhStatFilter, plainStatFilter, rhStatFilter, type StatLimits } from "./stats";

export const LOADOUT_ORDER: readonly LoadoutSlot[] = [
  "rh",
  "rh_ash",
  "lh",
  "lh_ash",
  "spell",
  "item",
  "talisman_1",
  "talisman_2",
  "rule_1",
  "rule_2",
  "armor",
];

export interface LoadoutInput {
  readonly data: EngineData;
  readonly characterClass: string;
  readonly boss: string | null;
  readonly counted: ReadonlySet<string>;
  readonly neverRoll?: ReadonlySet<string>;
  readonly limits: StatLimits;
  readonly random: Random;
  readonly catchUp?: CatchUp;
  readonly fixedShare?: FixedShare;
  /** `Run.tally`: the chance each option has had over the objectives done so far. */
  readonly tally?: Readonly<Record<string, number>>;
  /** RH rolls from these first; `null` when the setting is off. */
  readonly shortlist?: ReadonlySet<string> | null;
  /** A reroll keeps the slots before `from` as they are. */
  readonly from?: LoadoutSlot;
  readonly kept?: Readonly<Partial<Record<LoadoutSlot, string | null>>>;
  /** The reroll target's current result, left out unless it's the only option. */
  readonly exclude?: string | null;
  /** What the kept slots added to the tally, so the slots after them read it as when they first rolled. */
  readonly keptTally?: Readonly<Partial<Record<LoadoutSlot, TallyAdded>>>;
  readonly observe?: RollObserver;
}

/** Holds a roll for each slot rolled, in rolling order. */
export type Loadout = ReadonlyMap<LoadoutSlot, SlotRoll>;

function rolledItem(context: RollContext, slot: PoolSlot): Item | undefined {
  const id = context.state.rolled.get(slot);
  return id === null || id === undefined ? undefined : context.data.items.get(id);
}

/** A weapon that can't hold an ash has none, whatever a class row says. */
export function ashFits(data: EngineData, ashId: string, hand: Item): boolean {
  if (hand.infusable !== true) return false;
  return (data.ashFits.get(ashId) ?? []).some(
    (row) =>
      row.category === hand.category &&
      (row.subcategory === null || row.subcategory === hand.subcategory),
  );
}

function ashFilter(context: RollContext, hand: PoolSlot): OptionFilter {
  const item = rolledItem(context, hand);
  return (option) => item !== undefined && ashFits(context.data, option.row.id, item);
}

/** An empty slot may follow another; anything else may show only once. */
function differsFrom(context: RollContext, slot: PoolSlot): OptionFilter {
  const taken = context.state.rolled.get(slot);
  return (option) => isNone(option.row.id) || option.row.id !== taken;
}

/** `none` may repeat, because several slots roll it; a real weapon may exist only once. */
function notInTheOtherHand(context: RollContext): OptionFilter {
  const rh = context.state.rolled.get("rh");
  return (option) => option.row.id === "none" || option.row.id !== rh;
}

function castType(hand: Item | undefined): Item["category"] | null {
  if (hand?.subcategory === "glintstone_staff") return "sorcery";
  if (hand?.subcategory === "sacred_seal") return "incantation";
  return null;
}

/** RH wins if the hands disagree. `none` stays, so a staff that only holds an ash changes nothing. */
export function spellTypeFilter(context: RollContext): OptionFilter {
  const type = castType(rolledItem(context, "rh")) ?? castType(rolledItem(context, "lh"));
  if (type === null) return () => true;
  return (option) =>
    option.kind !== "item" ||
    (option.row.category !== "sorcery" && option.row.category !== "incantation") ||
    option.row.category === type;
}

function filtersFor(slot: LoadoutSlot, context: RollContext, limits: StatLimits): PoolFilters {
  switch (slot) {
    case "rh":
      return { stats: rhStatFilter(context, limits) };
    case "rh_ash":
      return { rules: [ashFilter(context, "rh")] };
    case "lh":
      return { rules: [notInTheOtherHand(context)], stats: lhStatFilter(context, limits) };
    case "lh_ash":
      return { rules: [ashFilter(context, "lh"), differsFrom(context, "rh_ash")] };
    case "spell":
      return { rules: [spellTypeFilter(context)], stats: plainStatFilter(limits) };
    default:
      return {};
  }
}

function excluding(filters: PoolFilters, exclude: string): PoolFilters {
  return { ...filters, rules: [...(filters.rules ?? []), (option) => option.row.id !== exclude] };
}

/** Weighs the pool without the excluded option, or with it when nothing else is left. */
function weighExcluding(context: RollContext, slot: LoadoutSlot, filters: PoolFilters, exclude: string | null): SlotPoolResult {
  const options = slotOptions(context.data, context.state.characterClass, slot);
  if (exclude !== null) {
    const result = weighOptions(context, options, excluding(filters, exclude));
    if (result.options.some((row) => row.weight > 0)) return result;
  }
  return weighOptions(context, options, filters);
}

/** Rolls without the excluded option, or with it when nothing else is left. */
function rollExcluding(
  context: RollContext,
  slot: LoadoutSlot,
  filters: PoolFilters,
  exclude: string | null,
  random: Random,
): SlotRoll {
  const options = slotOptions(context.data, context.state.characterClass, slot);
  if (exclude !== null) {
    const roll = sample(weighOptions(context, options, excluding(filters, exclude)), random);
    if (roll.chosen !== null) return roll;
  }
  return sample(weighOptions(context, options, filters), random);
}

/** Listed weapons skip location, boss status and stats; `none` can't be listed, so it only joins
 * the pool, and a pool with no listed weapon left falls back to the usual one. */
function rollShortlistRh(
  context: RollContext,
  listed: ReadonlySet<string>,
  exclude: string | null,
  random: Random,
): SlotRoll | null {
  const firstPool: RollContext = { ...context, counted: listed };
  const options = slotOptions(context.data, context.state.characterClass, "rh").filter(
    (option) => option.row.id === "none" || listed.has(option.row.id),
  );
  const isListed: OptionFilter = (option) => listed.has(option.row.id);
  const notExcluded: OptionFilter = (option) => option.row.id !== exclude;
  const result = weighOptions(firstPool, options, exclude === null ? {} : { rules: [notExcluded] });
  if (!result.options.some((row) => isListed(row.option))) return null;
  return { ...sample(result, random), fromShortlist: true };
}

export function rollLoadout(input: LoadoutInput): Loadout {
  const { data, characterClass, boss, counted, limits, random } = input;
  const from = input.from ?? "rh";
  const start = LOADOUT_ORDER.indexOf(from);
  const rolled = new Map<PoolSlot, string | null>();
  for (const slot of LOADOUT_ORDER.slice(0, start)) {
    const value = input.kept?.[slot];
    if (value !== undefined && slot !== "armor") rolled.set(slot, value);
  }
  const loadout = new Map<LoadoutSlot, SlotRoll>();
  const state: RollState = { characterClass, boss, rolled };
  const context: RollContext = {
    data,
    state,
    counted,
    ...(input.neverRoll === undefined ? {} : { neverRoll: input.neverRoll }),
    ...(input.catchUp === undefined ? {} : { catchUp: input.catchUp }),
    ...(input.fixedShare === undefined ? {} : { fixedShare: input.fixedShare }),
  };
  // Each slot reads the tally with every earlier slot of this objective added, a second talisman its first: one copy
  // of the run's tally per loadout, added to in place
  const had = addTally(input.tally ?? {}, ...LOADOUT_ORDER.slice(0, start).map((slot) => input.keptTally?.[slot] ?? {}));

  const record = (slot: LoadoutSlot, roll: SlotRoll) => {
    if (slot !== "armor") rolled.set(slot, roll.chosen?.option.row.id ?? null);
    for (const [key, value] of Object.entries(roll.tally)) had[key] = (had[key] ?? 0) + value;
    loadout.set(slot, roll);
    input.observe?.(slot, roll);
  };
  const firstOf = new Map([...PAIRED].map(([first, second]) => [second, first]));
  const pooled = (slot: LoadoutSlot) => slot === "armor" || data.pools.has(poolKey(characterClass, slot));

  for (const slot of LOADOUT_ORDER.slice(start)) {
    if (loadout.has(slot) || !pooled(slot)) continue;
    const exclude = slot === from ? (input.exclude ?? null) : null;
    const slotContext: RollContext =
      input.catchUp === undefined ? context : { ...context, tally: { had, scope: tallyScope(input.catchUp, characterClass, slot) } };
    const second = PAIRED.get(slot as PoolSlot);
    if (second !== undefined && pooled(second)) {
      // The pair rolls as one draw; neither slot has rolled, so no row reading the pair weighs either pool alone
      const one = weighExcluding(slotContext, slot, filtersFor(slot, slotContext, limits), exclude);
      const two = weighOptions(slotContext, slotOptions(data, characterClass, second), {});
      const [firstRoll, secondRoll] = rollPair(data, state, [slot as PoolSlot, second], one, two, random, input.catchUp?.boosted);
      record(slot, firstRoll);
      record(second, secondRoll);
      continue;
    }
    const first = firstOf.get(slot as PoolSlot);
    if (first !== undefined && rolled.has(first)) {
      // The first slot was kept: the second reads it through the same pair rows, both ways
      const without = new Map(rolled);
      without.delete(first);
      const alone: RollContext = { ...slotContext, state: { ...state, rolled: without } };
      const two = weighExcluding(alone, slot, {}, exclude);
      const takenId = rolled.get(first) ?? null;
      const taken = takenId === null ? null : (slotOptions(data, characterClass, first).find((option) => option.row.id === takenId) ?? null);
      record(slot, rollSecondOfPair(data, state, [first, slot as PoolSlot], two, taken, random, input.catchUp?.boosted));
      continue;
    }
    const shortlisted =
      slot === "rh" && input.shortlist ? rollShortlistRh(slotContext, input.shortlist, exclude, random) : null;
    record(slot, shortlisted ?? rollExcluding(slotContext, slot, filtersFor(slot, slotContext, limits), exclude, random));
  }
  return loadout;
}
