import type { Item, PoolSlot } from "./database";
import { poolKey, type EngineData } from "./engineData";
import type { RollState } from "./modifiers";
import { rollSlot, type OptionFilter, type Random, type RollContext, type SlotRoll } from "./slotRoll";
import { lhStatFilter, plainStatFilter, rhStatFilter, type StatLimits } from "./stats";

export const LOADOUT_ORDER: readonly PoolSlot[] = [
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
];

export interface LoadoutInput {
  readonly data: EngineData;
  readonly build: string;
  readonly boss: string | null;
  readonly counted: ReadonlySet<string>;
  readonly limits: StatLimits;
  readonly random: Random;
}

/** Holds a roll for each slot the build has a row for, in rolling order. */
export type Loadout = ReadonlyMap<PoolSlot, SlotRoll>;

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

function filtersFor(
  slot: PoolSlot,
  context: RollContext,
  limits: StatLimits,
): readonly OptionFilter[] {
  switch (slot) {
    case "rh":
      return [rhStatFilter(context, limits)];
    case "rh_ash":
      return [ashFilter(context, "rh")];
    case "lh":
      return [lhStatFilter(context, limits), notInTheOtherHand(context)];
    case "lh_ash":
      return [ashFilter(context, "lh"), differsFrom(context, "rh_ash")];
    case "spell":
      return [plainStatFilter(limits), spellTypeFilter(context)];
    case "talisman_2":
      return [differsFrom(context, "talisman_1")];
    case "rule_2":
      return [differsFrom(context, "rule_1")];
    default:
      return [];
  }
}

export function rollLoadout(input: LoadoutInput): Loadout {
  const { data, build, boss, counted, limits, random } = input;
  const rolled = new Map<PoolSlot, string | null>();
  const loadout = new Map<PoolSlot, SlotRoll>();
  const state: RollState = { build, boss, rolled };
  const context: RollContext = { data, state, counted };

  for (const slot of LOADOUT_ORDER) {
    if (!data.pools.has(poolKey(build, slot))) continue;
    const roll = rollSlot(context, slot, random, filtersFor(slot, context, limits));
    rolled.set(slot, roll.chosen?.option.row.id ?? null);
    loadout.set(slot, roll);
  }
  return loadout;
}
