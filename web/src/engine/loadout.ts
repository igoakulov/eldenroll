import type { Item, LoadoutSlot, PoolSlot } from "./database";
import { poolKey, type EngineData } from "./engineData";
import type { RollState } from "./modifiers";
import {
  NO_REPETITION,
  sample,
  slotOptions,
  weighOptions,
  type OptionFilter,
  type PoolFilters,
  type Random,
  type Repetition,
  type RollContext,
  type SlotRoll,
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
  readonly countedIfBossesDead?: ReadonlySet<string>;
  readonly neverRoll?: ReadonlySet<string>;
  readonly limits: StatLimits;
  readonly random: Random;
  readonly repetition?: Repetition;
  /** RH rolls from these first; `null` when the setting is off. */
  readonly upgraded?: ReadonlySet<string> | null;
  /** A reroll keeps the slots before `from` as they are. */
  readonly from?: LoadoutSlot;
  readonly kept?: Readonly<Partial<Record<LoadoutSlot, string | null>>>;
  /** The reroll target's current result, left out unless it's the only option. */
  readonly exclude?: string | null;
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

function differsFrom(context: RollContext, slot: PoolSlot): OptionFilter {
  const taken = context.state.rolled.get(slot);
  return (option) => option.row.id !== taken;
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
    case "talisman_2":
      return { rules: [differsFrom(context, "talisman_1")] };
    case "rule_2":
      return { rules: [differsFrom(context, "rule_1")] };
    default:
      return {};
  }
}

function excluding(filters: PoolFilters, exclude: string): PoolFilters {
  return { ...filters, rules: [...(filters.rules ?? []), (option) => option.row.id !== exclude] };
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
function rollUpgradedRh(
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
  return { ...sample(result, random), upgraded: true };
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
    repetition: input.repetition ?? NO_REPETITION,
    ...(input.countedIfBossesDead === undefined
      ? {}
      : { countedIfBossesDead: input.countedIfBossesDead }),
    ...(input.neverRoll === undefined ? {} : { neverRoll: input.neverRoll }),
  };

  for (const slot of LOADOUT_ORDER.slice(start)) {
    if (slot !== "armor" && !data.pools.has(poolKey(characterClass, slot))) continue;
    const exclude = slot === from ? (input.exclude ?? null) : null;
    const upgraded =
      slot === "rh" && input.upgraded ? rollUpgradedRh(context, input.upgraded, exclude, random) : null;
    const roll =
      upgraded ?? rollExcluding(context, slot, filtersFor(slot, context, limits), exclude, random);
    if (slot !== "armor") rolled.set(slot, roll.chosen?.option.row.id ?? null);
    loadout.set(slot, roll);
  }
  return loadout;
}
