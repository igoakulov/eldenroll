// What the simulation page shows, counted from the rows a run records (web/sim/README.md#The page). Words are
// the page's: this returns ids, game names and numbers.
import type { Condition, LoadoutSlot, Modifier, Selector } from "../src/engine/database";
import { POOL_SLOTS } from "../src/engine/database";
import type { EngineData } from "../src/engine/engineData";
import { STATS, type Stat } from "../src/engine/settings";
import { catchUpMultiplier, repeatKey, slotOptions } from "../src/engine/slotRoll";
import { matchesOption, type Option } from "../src/engine/selectors";
import { DEFAULT_HYPERPARAMS } from "../src/engine/hyperparams";
import {
  BUCKET,
  CHANCE_SLOTS,
  playOrder,
  type ChanceSum,
  type ChanceSums,
  type ObjectiveRow,
  type RollRow,
  type RunResult,
} from "./simulate";

/** A share from fewer objectives than this reads as noise. */
export const THIN_SAMPLE = 20;
/** A repeat within this many objectives counts as soon. */
export const SOON = 10;

export interface Obj {
  readonly run: number;
  readonly row: ObjectiveRow;
  readonly rolls: ReadonlyMap<LoadoutSlot, RollRow>;
}

export interface Sample {
  readonly data: EngineData;
  readonly results: readonly RunResult[];
  /** Every objective, every class. */
  readonly all: readonly Obj[];
  /** Objectives of the picked classes. */
  readonly objectives: readonly Obj[];
  readonly classes: readonly string[];
}

export function sampleOf(data: EngineData, results: readonly RunResult[], classes: readonly string[]): Sample {
  const all: Obj[] = [];
  results.forEach((result, run) => {
    const byObjective = new Map<number, Map<LoadoutSlot, RollRow>>();
    for (const roll of result.rolls) {
      const slots = byObjective.get(roll.objective) ?? new Map<LoadoutSlot, RollRow>();
      slots.set(roll.slot, roll);
      byObjective.set(roll.objective, slots);
    }
    for (const row of result.objectives) {
      all.push({ run, row, rolls: byObjective.get(row.objective) ?? new Map() });
    }
  });
  const picked = new Set(classes);
  return { data, results, all, objectives: all.filter((one) => picked.has(one.row.characterClass)), classes };
}

// Names

export function humanise(id: string): string {
  const words = id.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A repeat key's game name: `item:…`, `alias:…`, `rule:…`, `armor_set:…`, `character_class:…`. */
export function nameOf(data: EngineData, key: string): string {
  const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
  if (kind === "alias") return data.aliases.get(id)?.label ?? id;
  if (kind === "item") return data.items.get(id)?.name ?? id;
  if (kind === "rule") return data.rules.get(id)?.name ?? id;
  if (kind === "armor_set") return data.armorSets.get(id)?.name ?? id;
  if (kind === "character_class") return data.database.character_class.find((row) => row.id === id)?.name ?? id;
  return key;
}

export function className(data: EngineData, id: string): string {
  return nameOf(data, `character_class:${id}`);
}

export function regionName(data: EngineData, id: string): string {
  return data.database.region.find((row) => row.id === id)?.name ?? id;
}

function selectorNames(data: EngineData, selector: Selector): readonly string[] | null {
  if (selector.ids === null) return null;
  return selector.ids.map((id) => {
    if (selector.kind === "item") return data.items.get(id)?.name ?? id;
    if (selector.kind === "rule") return data.rules.get(id)?.name ?? id;
    if (selector.kind === "armor_set") return data.armorSets.get(id)?.name ?? id;
    if (selector.kind === "boss") return data.database.region.find((row) => row.id === id)?.name ?? data.bosses.get(id)?.name ?? id;
    return humanise(id);
  });
}

export type Trigger =
  | { readonly kind: "classes"; readonly names: readonly string[] }
  | {
      readonly kind: "rolled";
      readonly slots: readonly (LoadoutSlot | "boss")[];
      readonly negated: boolean;
      /** null for anything of the selector's kind. */
      readonly names: readonly string[] | null;
    };

/** A modifier in game names: when its conditions hold, its targets' odds are multiplied by `value`. */
export interface ModifierText {
  readonly id: string;
  readonly when: readonly Trigger[];
  readonly target: readonly string[] | null;
  readonly value: number;
}

export function modifierText(data: EngineData, modifier: Modifier): ModifierText {
  const trigger = (condition: Condition): Trigger =>
    condition.kind === "character_class"
      ? { kind: "classes", names: condition.ids.map((id) => className(data, id)) }
      : {
          kind: "rolled",
          slots: condition.slots,
          negated: condition.negated,
          names: selectorNames(data, condition.selector),
        };
  return {
    id: modifier.id,
    when: modifier.when.map(trigger),
    target: selectorNames(data, modifier.target),
    value: modifier.value,
  };
}

// Shares

export interface ShareRow {
  readonly key: string;
  readonly name: string;
  readonly count: number;
  /** Showings per run: a run is the unit a share is judged by, more runs only widen the sample. */
  readonly perRun: number;
  /** 0 to 1, of the table's objectives. */
  readonly share: number;
  /** 0 to 1, of the runs, the share it showed in at least once. */
  readonly seenIn: number;
  /** The most its catch-up boost can reach; null where none applies. */
  readonly ceiling: number | null;
  /** The share if every weapon class held as many weapons, where it applies. */
  readonly adjusted?: number;
}

export interface ShareTable {
  readonly total: number;
  readonly runs: number;
  readonly rows: readonly ShareRow[];
}

/** `universe` adds a row at 0 for each key that never showed. */
function shareTable(
  sample: Sample,
  objectives: readonly Obj[],
  keysOf: (one: Obj) => readonly string[],
  name: (key: string) => string,
  universe: Iterable<string> = [],
): ShareTable {
  const counted = new Map<string, number>();
  const inRuns = new Map<string, Set<number>>();
  for (const key of universe) counted.set(key, 0);
  for (const one of objectives) {
    for (const key of new Set(keysOf(one))) {
      counted.set(key, (counted.get(key) ?? 0) + 1);
      inRuns.set(key, (inRuns.get(key) ?? new Set()).add(one.run));
    }
  }
  const total = objectives.length;
  const runs = sample.results.length;
  const rows = [...counted]
    .map(([key, count]) => ({
      key,
      name: name(key),
      count,
      perRun: count / runs,
      share: total === 0 ? 0 : count / total,
      seenIn: (inRuns.get(key)?.size ?? 0) / runs,
      ceiling: ceilingOf(sample.data, key),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total, runs, rows };
}

const chosenKeys =
  (slots: readonly LoadoutSlot[], test: (roll: RollRow) => boolean = () => true) =>
  (one: Obj): string[] =>
    slots.flatMap((slot) => {
      const roll = one.rolls.get(slot);
      return roll !== undefined && roll.chosenKey !== null && test(roll) ? [roll.chosenKey] : [];
    });

function chosenItem(data: EngineData, roll: RollRow | undefined) {
  return roll?.chosen === null || roll?.chosen === undefined ? undefined : data.items.get(roll.chosen);
}

/** Options of the classes' pools for these slots that some roll of that class offered, so a table can list what was
 * in reach and never showed. */
function inReach(sample: Sample, classes: readonly string[], slots: readonly LoadoutSlot[], test: (option: Option) => boolean = () => true): Option[] {
  const found: Option[] = [];
  for (const characterClass of classes) {
    const offered = new Set(sample.results.flatMap((result) => [...(result.offered.get(characterClass) ?? [])]));
    for (const slot of slots) {
      for (const option of slotOptions(sample.data, characterClass, slot)) {
        if (option.row.odds > 0 && offered.has(repeatKey(option)) && test(option)) found.push(option);
      }
    }
  }
  return found;
}

/** A weapon class, a shield class or a category: what the hand holds, `none` for an empty one. */
function handClass(data: EngineData, roll: RollRow | undefined): string | undefined {
  const item = chosenItem(data, roll);
  return item === undefined ? undefined : (item.subcategory ?? item.category);
}

/** Pools whose only possible roll is `none`: a bare pick, never a gap. */
export function alwaysNone(data: EngineData, characterClass: string, slot: LoadoutSlot): boolean {
  const options = slotOptions(data, characterClass, slot);
  return options.length === 1 && options[0]!.row.id === "none";
}

function poolSizes(data: EngineData, characterClass: string, slot: LoadoutSlot): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const option of slotOptions(data, characterClass, slot)) {
    if (option.kind !== "item" || option.row.odds <= 0) continue;
    const key = option.row.subcategory ?? option.row.category;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** A hand counted by weapon class, or by the weapon itself. */
export type HandView = "class" | "weapon";

/** A hand by weapon, or by weapon class with each share beside the one it would have if every class held the same
 * number of weapons, so a skew from pool size reads apart from one from catch-up, stat gates or a modifier. With
 * several classes picked, each class's adjusted shares count by its objectives. */
export function handShares(sample: Sample, slot: "rh" | "lh", by: HandView): ShareTable | null {
  const { data } = sample;
  const classes = sample.classes.filter((id) => !alwaysNone(data, id, slot));
  if (classes.length === 0) return null;
  const inClasses = sample.objectives.filter((one) => classes.includes(one.row.characterClass));
  if (by === "weapon") {
    const universe = inReach(sample, classes, [slot]).map(repeatKey);
    return shareTable(sample, inClasses, chosenKeys([slot]), (key) => nameOf(data, key), universe);
  }
  const table = shareTable(
    sample,
    inClasses,
    (one) => {
      const key = handClass(data, one.rolls.get(slot));
      return key === undefined ? [] : [key];
    },
    humanise,
    inReach(sample, classes, [slot]).flatMap((option) =>
      option.kind === "item" ? [option.row.subcategory ?? option.row.category] : [],
    ),
  );
  const adjusted = new Map<string, number>();
  for (const characterClass of classes) {
    const own = inClasses.filter((one) => one.row.characterClass === characterClass);
    if (own.length === 0) continue;
    const sizes = poolSizes(data, characterClass, slot);
    const perItem = new Map<string, number>();
    for (const one of own) {
      const key = handClass(data, one.rolls.get(slot));
      if (key !== undefined) perItem.set(key, (perItem.get(key) ?? 0) + 1 / Math.max(1, sizes.get(key) ?? 1));
    }
    const sum = [...perItem.values()].reduce((total, value) => total + value, 0);
    if (sum === 0) continue;
    for (const [key, value] of perItem) {
      adjusted.set(key, (adjusted.get(key) ?? 0) + (value / sum) * (own.length / inClasses.length));
    }
  }
  return { ...table, rows: table.rows.map((row) => ({ ...row, adjusted: adjusted.get(row.key) ?? 0 })) };
}

export interface PairRow extends ShareRow {
  readonly rh: string;
  readonly lh: string;
}

export interface Pairs {
  readonly total: number;
  readonly rows: readonly PairRow[];
  /** Of objectives with a weapon in each hand, the share whose two weapons share a class. */
  readonly sameClass: { readonly count: number; readonly of: number };
}

/** Right hand and left hand classes together, as the player holds them. */
export function pairs(sample: Sample): Pairs {
  const { data } = sample;
  let same = 0;
  let both = 0;
  for (const one of sample.objectives) {
    const rhItem = chosenItem(data, one.rolls.get("rh"));
    const lhItem = chosenItem(data, one.rolls.get("lh"));
    if (rhItem?.category === "weapon" && lhItem?.category === "weapon") {
      both += 1;
      if (handClass(data, one.rolls.get("rh")) === handClass(data, one.rolls.get("lh"))) same += 1;
    }
  }
  const table = shareTable(
    sample,
    sample.objectives,
    (one) => {
      const rh = handClass(data, one.rolls.get("rh"));
      const lh = handClass(data, one.rolls.get("lh"));
      return rh === undefined || lh === undefined ? [] : [`${rh}+${lh}`];
    },
    (key) => key.split("+").map(humanise).join(" + "),
  );
  const rows = table.rows.map((row) => {
    const [rh = "", lh = ""] = row.key.split("+").map(humanise);
    return { ...row, rh, lh };
  });
  return { total: table.total, rows, sameClass: { count: same, of: both } };
}

/** Whether an ash fits shields rather than weapons. */
function shieldAsh(data: EngineData, ashId: string): boolean {
  return (data.ashFits.get(ashId) ?? []).some((row) => row.category === "shield");
}

export type GearTable = "spell" | "weaponAsh" | "shieldAsh" | "item" | "talisman" | "rule" | "armor";

/** Everything but the hands: a share of objectives showing each option, in either slot where there are two. */
export function gearShares(sample: Sample, table: GearTable): ShareTable | null {
  const { data } = sample;
  const name = (key: string) => nameOf(data, key);
  if (table === "spell") {
    const classes = sample.classes.filter((id) => !alwaysNone(data, id, "spell"));
    if (classes.length === 0) return null;
    const objectives = sample.objectives.filter((one) => classes.includes(one.row.characterClass));
    return shareTable(sample, objectives, chosenKeys(["spell"]), name, inReach(sample, classes, ["spell"]).map(repeatKey));
  }
  const ash = (shield: boolean) => (option: Option) => shieldAsh(data, option.row.id) === shield;
  const universe = {
    weaponAsh: inReach(sample, sample.classes, ["rh_ash", "lh_ash"], ash(false)),
    shieldAsh: inReach(sample, sample.classes, ["rh_ash", "lh_ash"], ash(true)),
    item: inReach(sample, sample.classes, ["item"]),
    talisman: inReach(sample, sample.classes, ["talisman_1", "talisman_2"]),
    rule: inReach(sample, sample.classes, ["rule_1", "rule_2"]),
    armor: inReach(sample, sample.classes, ["armor"]),
  }[table].map(repeatKey);
  const keysOf = {
    weaponAsh: chosenKeys(["rh_ash", "lh_ash"], (roll) => !shieldAsh(data, roll.chosen ?? "")),
    shieldAsh: chosenKeys(["rh_ash", "lh_ash"], (roll) => shieldAsh(data, roll.chosen ?? "")),
    item: chosenKeys(["item"]),
    talisman: chosenKeys(["talisman_1", "talisman_2"]),
    rule: chosenKeys(["rule_1", "rule_2"]),
    armor: chosenKeys(["armor"]),
  }[table];
  return shareTable(sample, sample.objectives, keysOf, name, universe);
}

// Overview

export interface RunSummary {
  readonly runs: number;
  readonly objectives: number;
  readonly level: number;
  readonly stats: Readonly<Record<Stat, number>>;
}

const mean = (values: readonly number[]) =>
  values.length === 0 ? NaN : values.reduce((sum, value) => sum + value, 0) / values.length;

/** Per run, averaged: whole runs, so the class filter doesn't apply. */
export function runSummary(sample: Sample): RunSummary {
  const { results } = sample;
  const levels = results.map((result) => STATS.reduce((sum, stat) => sum + result.finalStats[stat], 0) - 79);
  return {
    runs: results.length,
    objectives: mean(results.map((result) => result.objectives.length)),
    level: mean(levels),
    stats: Object.fromEntries(STATS.map((stat) => [stat, mean(results.map((result) => result.finalStats[stat]))])) as Record<
      Stat,
      number
    >,
  };
}

/** The picked classes' shares of every objective. */
export function classShares(sample: Sample): ShareTable {
  const table = shareTable(
    sample,
    sample.all,
    (one) => [`character_class:${one.row.characterClass}`],
    (key) => nameOf(sample.data, key),
    sample.classes.map((id) => `character_class:${id}`),
  );
  return { ...table, rows: table.rows.filter((row) => sample.classes.includes(row.key.slice("character_class:".length))) };
}

/** How many of an objective's two rule slots show `None`; both never can, since `rule_2` leaves out `rule_1`. */
export function ruleNone(sample: Sample): { readonly total: number; readonly neither: number; readonly one: number } {
  let neither = 0;
  let one = 0;
  for (const objective of sample.objectives) {
    const nones = (["rule_1", "rule_2"] as const).filter((slot) => objective.rolls.get(slot)?.chosen === "none").length;
    if (nones === 0) neither += 1;
    else one += 1;
  }
  return { total: sample.objectives.length, neither, one };
}

export interface NeverRolled {
  /** In a pool of a picked class at some point, never shown. */
  readonly inReach: readonly string[];
  /** In none of their pools under these settings. */
  readonly outOfReach: readonly string[];
}

export function neverRolled(sample: Sample): NeverRolled {
  const { data } = sample;
  const universe = new Set<string>();
  for (const characterClass of sample.classes) {
    for (const slot of [...POOL_SLOTS, "armor"] as LoadoutSlot[]) {
      for (const option of slotOptions(data, characterClass, slot)) if (option.row.odds > 0) universe.add(repeatKey(option));
    }
  }
  const offered = new Set(
    sample.results.flatMap((result) => sample.classes.flatMap((id) => [...(result.offered.get(id) ?? [])])),
  );
  const chosen = new Set(sample.objectives.flatMap((one) => [...one.rolls.values()].map((roll) => roll.chosenKey ?? "")));
  const names = (keys: string[]) => keys.map((key) => nameOf(data, key)).sort((a, b) => a.localeCompare(b));
  return {
    inReach: names([...universe].filter((key) => offered.has(key) && !chosen.has(key))),
    outOfReach: names([...universe].filter((key) => !offered.has(key))),
  };
}

export const REPEAT_KINDS = ["class", "rh", "lh", "ash", "spell", "item", "talisman", "rule", "armor"] as const;
export type RepeatKind = (typeof REPEAT_KINDS)[number];

const notNone = (roll: RollRow) => roll.chosen !== "none";
const REPEAT_KEYS: Readonly<Record<RepeatKind, (one: Obj) => readonly string[]>> = {
  class: (one) => [`character_class:${one.row.characterClass}`],
  rh: chosenKeys(["rh"], notNone),
  lh: chosenKeys(["lh"], notNone),
  ash: chosenKeys(["rh_ash", "lh_ash"]),
  spell: chosenKeys(["spell"]),
  item: chosenKeys(["item"]),
  talisman: chosenKeys(["talisman_1", "talisman_2"]),
  rule: chosenKeys(["rule_1", "rule_2"], notNone),
  armor: chosenKeys(["armor"]),
};

export interface RepeatRow {
  readonly kind: RepeatKind;
  readonly showings: number;
  readonly perRun: number;
  /** Mean objectives since the same thing last showed in that run. */
  readonly gap: number;
  /** The share of showings repeating one from the last `SOON` objectives. */
  readonly soon: number;
}

export function repeats(sample: Sample): readonly RepeatRow[] {
  return REPEAT_KINDS.map((kind) => {
    const gaps: number[] = [];
    let showings = 0;
    const last = new Map<string, number>();
    let run = -1;
    for (const one of sample.objectives) {
      if (one.run !== run) {
        last.clear();
        run = one.run;
      }
      for (const key of new Set(REPEAT_KEYS[kind](one))) {
        showings += 1;
        const before = last.get(key);
        if (before !== undefined) gaps.push(one.row.objective - before);
        last.set(key, one.row.objective);
      }
    }
    return { kind, showings, perRun: showings / sample.results.length, gap: mean(gaps), soon: showings === 0 ? 0 : gaps.filter((gap) => gap <= SOON).length / showings };
  });
}

export interface EmptyRow {
  readonly characterClass: string;
  readonly slot: LoadoutSlot;
  readonly count: number;
  readonly perRun: number;
  /** Of the picked classes' objectives. */
  readonly share: number;
}

/** Rolls that found nothing, not even `none`, where `none` isn't the only possible roll. */
export function empties(sample: Sample): readonly EmptyRow[] {
  const counts = new Map<string, EmptyRow>();
  for (const one of sample.objectives) {
    for (const [slot, roll] of one.rolls) {
      if (roll.chosen !== null || alwaysNone(sample.data, one.row.characterClass, slot)) continue;
      const key = `${one.row.characterClass}/${slot}`;
      const row = counts.get(key) ?? { characterClass: one.row.characterClass, slot, count: 0, perRun: 0, share: 0 };
      counts.set(key, { ...row, count: row.count + 1 });
    }
  }
  const total = sample.objectives.length;
  const runs = sample.results.length;
  return [...counts.values()]
    .map((row) => ({ ...row, perRun: row.count / runs, share: row.count / total }))
    .sort((a, b) => b.count - a.count);
}

// Boosts

export interface CatchUpRow {
  readonly key: string;
  readonly count: number;
  readonly perRun: number;
  /** Of the rolls that showed an item. */
  readonly share: number;
  /** The mean catch-up boost on the items that won. */
  readonly catchUp: number;
}

const ceilingRegions = new WeakMap<EngineData, ReadonlyMap<string, string>>();

/** The region setting each item's catch-up ceiling: its earliest, the one with the most `run_left`. */
function ceilingRegion(data: EngineData, itemId: string): string | undefined {
  let regions = ceilingRegions.get(data);
  if (regions === undefined) {
    const { database } = data;
    const left = new Map(database.region.map((row) => [row.id, row.run_left]));
    const locationRegion = new Map(database.location.map((row) => [row.id, row.region_id]));
    const found = new Map<string, string>();
    for (const row of database.item_location) {
      const location = row.location_id ?? data.bosses.get(row.boss_instance_id ?? "")?.location_id;
      const region = location === undefined ? undefined : locationRegion.get(location);
      if (region === undefined) continue;
      const current = found.get(row.item_id);
      if (current === undefined || (left.get(region) ?? 0) > (left.get(current) ?? 0)) found.set(row.item_id, region);
    }
    regions = found;
    ceilingRegions.set(data, regions);
  }
  return regions.get(itemId);
}

/** Every roll that showed an item (`none` aside), grouped by the region setting its catch-up ceiling (`""` for an
 * item with no location). */
export function catchUpByRegion(sample: Sample): readonly CatchUpRow[] {
  const { data } = sample;
  const rolls = sample.objectives.flatMap((one) =>
    [...one.rolls.values()].filter(
      (roll) => roll.chosen !== null && roll.chosen !== "none" && data.items.has(roll.chosen),
    ),
  );
  const groups = new Map<string, RollRow[]>();
  for (const roll of rolls) {
    const key = ceilingRegion(data, roll.chosen ?? "") ?? "";
    groups.set(key, [...(groups.get(key) ?? []), roll]);
  }
  return [...playOrder(data.database), ""]
    .filter((key) => groups.has(key))
    .map((key) => {
      const list = groups.get(key)!;
      return { key, count: list.length, perRun: list.length / sample.results.length, share: list.length / rolls.length, catchUp: mean(list.map((roll) => roll.catchUp)) };
    });
}

export interface SynergyRow {
  readonly modifier: ModifierText;
  /** Per run: for a win, objectives where it was in play; for a showing outside it, objectives showing its target
   * without it. */
  readonly perRun: number;
  /** Of those objectives, the share where a boosted option won. */
  readonly share: number;
  readonly count: number;
}

const inAnyRoll = (one: Obj, test: (roll: RollRow) => boolean) => [...one.rolls.values()].some(test);

/** A boost that matches the left hand's weapon class to the right hand's: Slots' both-hands table reads these. */
function pairsHands(modifier: Modifier): boolean {
  const { target } = modifier;
  return (
    target.kind === "subcategory" &&
    modifier.when.some(
      (condition) =>
        condition.kind === "rolled" &&
        condition.selector.kind === "subcategory" &&
        condition.selector.ids?.join() === target.ids?.join(),
    )
  );
}

/** Every boosting modifier the Synergies tab lists. */
const isSynergy = (modifier: Modifier) => modifier.value > 1 && !pairsHands(modifier);

/** Every boosting modifier in play for the picked classes: how often it was active, and how often what it boosted
 * won. Counted per objective, since a talisman or rule boost is active in both of its slots. */
export function synergyWins(sample: Sample): readonly SynergyRow[] {
  const { data } = sample;
  const runs = sample.results.length;
  return data.database.modifier.flatMap((modifier): SynergyRow[] => {
    if (!isSynergy(modifier)) return [];
    const active = sample.objectives.filter((one) => inAnyRoll(one, (roll) => roll.boosts.includes(modifier.id)));
    if (active.length === 0) return [];
    const won = active.filter((one) => inAnyRoll(one, (roll) => roll.chosenBoosts.includes(modifier.id))).length;
    return [{ modifier: modifierText(data, modifier), perRun: active.length / runs, share: won / active.length, count: active.length }];
  });
}

function chosenOption(data: EngineData, roll: RollRow): Option | undefined {
  const id = roll.chosen ?? "";
  const item = data.items.get(id);
  if (roll.chosenKey?.startsWith("rule:")) {
    const rule = data.rules.get(id);
    return rule === undefined ? undefined : { kind: "rule", row: rule };
  }
  if (roll.chosenKey?.startsWith("armor_set:")) {
    const set = data.armorSets.get(id);
    return set === undefined ? undefined : { kind: "armor_set", row: set };
  }
  return item === undefined ? undefined : { kind: "item", row: item };
}

/** Every boosting modifier with a condition on the loadout: the objectives per run showing what it boosts without
 * it, its condition not holding, and their share of all objectives showing it. Only the classes its class condition names count, and
 * only the slots it was ever active in, so a Dual-Wield greatsword in the right hand isn't counted against the left
 * hand's pairing. */
export function outsideSynergy(sample: Sample): readonly SynergyRow[] {
  const { data } = sample;
  const runs = sample.results.length;
  return data.database.modifier.flatMap((modifier): SynergyRow[] => {
    if (!isSynergy(modifier) || !modifier.when.some((condition) => condition.kind === "rolled")) return [];
    const classes = modifier.when.flatMap((condition) => (condition.kind === "character_class" ? [condition.ids] : []));
    const slots = new Set(
      sample.all.flatMap((one) => [...one.rolls].flatMap(([slot, roll]) => (roll.boosts.includes(modifier.id) ? [slot] : []))),
    );
    const targets = (one: Obj) =>
      [...one.rolls].flatMap(([slot, roll]) => {
        if (slots.size > 0 && !slots.has(slot)) return [];
        const option = chosenOption(data, roll);
        return option !== undefined && matchesOption(modifier.target, option) ? [roll] : [];
      });
    const showing = sample.objectives.filter(
      (one) => classes.every((ids) => ids.includes(one.row.characterClass)) && targets(one).length > 0,
    );
    if (showing.length === 0) return [];
    const outside = showing.filter((one) => targets(one).every((roll) => !roll.chosenBoosts.includes(modifier.id))).length;
    return [
      { modifier: modifierText(data, modifier), perRun: outside / runs, share: outside / showing.length, count: showing.length },
    ];
  });
}

// Items

/** Each option's showings in each run: once per completed objective, every class, every slot. `none` is one key
 * across all slots. */
function showings(sample: Sample): ReadonlyMap<string, readonly (readonly number[])[]> {
  const byKey = new Map<string, number[][]>();
  for (const one of sample.all) {
    const keys = new Set([...one.rolls.values()].flatMap((roll) => (roll.chosenKey === null ? [] : [roll.chosenKey])));
    for (const key of keys) {
      const runs = byKey.get(key) ?? sample.results.map(() => []);
      runs[one.run]!.push(one.row.objective);
      byKey.set(key, runs);
    }
  }
  return byKey;
}

/** The odds an option's own row gives it; an alias's members' odds added. */
function baseOdds(data: EngineData, key: string): number {
  const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
  if (kind === "item") return data.items.get(id)?.odds ?? 0;
  if (kind === "alias") return data.database.item.filter((row) => row.alias === id).reduce((sum, row) => sum + row.odds, 0);
  if (kind === "rule") return data.rules.get(id)?.odds ?? 0;
  if (kind === "armor_set") return data.armorSets.get(id)?.odds ?? 0;
  return 0;
}

/** The catch-up boost's ceiling on an item or armor set, the most it can get (`catchUpMultiplier`); null for
 * anything else, an alias included, whose members each carry their own. */
function ceilingOf(data: EngineData, key: string): number | null {
  const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
  const item = kind === "item" ? data.items.get(id) : undefined;
  const set = kind === "armor_set" ? data.armorSets.get(id) : undefined;
  const option: Option | undefined =
    item !== undefined ? { kind: "item", row: item } : set !== undefined ? { kind: "armor_set", row: set } : undefined;
  return option === undefined ? null : catchUpMultiplier(data, option, DEFAULT_HYPERPARAMS.catchUp);
}

export interface ItemRow {
  readonly key: string;
  readonly name: string;
}

/** Every option in reach for the picked classes. */
export function items(sample: Sample, chances: ChanceSums): readonly ItemRow[] {
  const picked = new Set(sample.classes);
  const keys = new Set<string>();
  for (const at of chances.keys()) {
    const [characterClass = "", , key = ""] = at.split("|");
    if (picked.has(characterClass)) keys.add(key);
  }
  return [...keys].map((key) => ({ key, name: nameOf(sample.data, key) }));
}

export interface ItemPoint {
  /** The stretch's first objective number. */
  readonly x: number;
  /** Mean chance per roll in the stretch, with the catch-up boost and with it removed from every option. */
  readonly chance: number;
  readonly plain: number;
  /** The mean catch-up boost on it in the stretch. */
  readonly catchUp: number;
  /** Rolls of the picked classes in the stretch where it was in reach. */
  readonly rolls: number;
  /** Times shown by the stretch's end, averaged over runs. */
  readonly shown: number;
}

/** Slots whose showings mark a slot's chart: the second talisman and combat rule slots show on the first's. */
const MARKED: Partial<Record<LoadoutSlot, readonly LoadoutSlot[]>> = {
  talisman_1: ["talisman_1", "talisman_2"],
  rule_1: ["rule_1", "rule_2"],
};

/** One option's chance over the run, per slot it rolls in, for the picked classes, with the objectives it showed
 * on in that slot, every run's together. */
export function itemSeries(
  sample: Sample,
  chances: ChanceSums,
  key: string,
): readonly { readonly slot: LoadoutSlot; readonly points: readonly ItemPoint[]; readonly shown: readonly number[] }[] {
  const picked = new Set(sample.classes);
  const bySlot = new Map<LoadoutSlot, Map<number, ChanceSum>>();
  for (const [at, sums] of chances) {
    const [characterClass = "", slot = "", option = "", stretch = ""] = at.split("|");
    if (option !== key || !picked.has(characterClass)) continue;
    const stretches = bySlot.get(slot as LoadoutSlot) ?? new Map<number, ChanceSum>();
    const total = stretches.get(Number(stretch)) ?? { chance: 0, plain: 0, boosted: 0, rolls: 0 };
    total.chance += sums.chance;
    total.plain += sums.plain;
    total.boosted += sums.boosted;
    total.rolls += sums.rolls;
    stretches.set(Number(stretch), total);
    bySlot.set(slot as LoadoutSlot, stretches);
  }
  const perRun = showings(sample).get(key) ?? sample.results.map(() => []);
  return CHANCE_SLOTS.filter((slot) => bySlot.has(slot)).map((slot) => ({
    slot,
    shown: sample.objectives.flatMap((one) =>
      (MARKED[slot] ?? [slot]).some((marked) => one.rolls.get(marked)?.chosenKey === key) ? [one.row.objective] : [],
    ),
    points: [...bySlot.get(slot)!]
      .sort(([a], [b]) => a - b)
      .map(([x, total]) => {
        const counts = perRun.map((objectives) => objectives.filter((objective) => objective <= x + BUCKET - 1).length);
        return {
          x,
          chance: total.chance / total.rolls,
          plain: total.plain / total.rolls,
          catchUp: total.plain > 0 ? total.boosted / total.plain : 1,
          rolls: total.rolls,
          shown: mean(counts),
        };
      }),
  }));
}

export function oddsOf(data: EngineData, key: string): { readonly odds: number; readonly ceiling: number | null } {
  return { odds: baseOdds(data, key), ceiling: ceilingOf(data, key) };
}
