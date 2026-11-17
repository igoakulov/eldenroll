// What the simulation page shows, counted from the rows a run records (web/sim/README.md#The page). Words are
// the page's: this returns ids, game names and numbers.
import type { Condition, Item, LoadoutSlot, Modifier, Selector } from "../src/engine/database";
import { isNone, POOL_SLOTS } from "../src/engine/database";
import { ashFits } from "../src/engine/loadout";
import type { EngineData } from "../src/engine/engineData";
import { derivedLevel, STATS, type Stat } from "../src/engine/settings";
import { optionKey, repeatKey, slotOptions } from "../src/engine/slotRoll";
import { matchesOption, type Option } from "../src/engine/selectors";
import {
  ashOnShield,
  BUCKET,
  CHANCE_SLOTS,
  playRank,
  readChanceKey,
  type ChanceSum,
  type ChanceSums,
  type ObjectiveRow,
  type RollRow,
  type RunResult,
} from "./simulate";

/** A share from fewer objectives than this reads as noise. */
export const THIN_SAMPLE = 20;
/** A repeat within this many objectives counts as soon. */
const SOON = 10;

interface Obj {
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

function humanise(id: string): string {
  const words = id.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A repeat key's game name: `item:…`, `alias:…`, `rule:…`, `armor_set:…`, `character_class:…`. */
function nameOf(data: EngineData, key: string): string {
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

function regionName(data: EngineData, id: string): string {
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

function modifierText(data: EngineData, modifier: Modifier): ModifierText {
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
  /** The share it would have from pool size alone, where it applies: every weapon class holding as many weapons, or
   * every item of a region's showing equally. */
  readonly adjusted?: number;
  /** By region, the share it would have if every option showed equally whenever it could roll: the time baseline. */
  readonly rollable?: number;
  /** A region's number in play order, from 1, which the page and `metrics.md` show before its name and sort by. */
  readonly order?: number;
}

/** A row's share against the one pool size alone would give: 1 even, above 1 more than its fair share; NaN where
 * none applies. */
export function vsFair(row: ShareRow): number {
  return row.adjusted === undefined || row.adjusted === 0 ? NaN : row.share / row.adjusted;
}

export interface ShareTable {
  /** Of objectives, or for a table by region of showings, since one objective can show two. */
  readonly total: number;
  readonly unit?: "showings";
  readonly runs: number;
  readonly rows: readonly ShareRow[];
}

interface Tally {
  /** Adds a row at 0 for each key that never showed. */
  readonly universe?: Iterable<string>;
  /** `objectives`: an objective counts once under each key it shows, out of every objective. `showings`: every key
   * counts, out of every showing, where two slots of one objective can share a key. */
  readonly basis?: "objectives" | "showings";
}

/** Every share the page shows is counted here, so they all count alike. */
function shareTable(
  sample: Sample,
  objectives: readonly Obj[],
  keysOf: (one: Obj) => readonly string[],
  name: (key: string) => string,
  { universe = [], basis = "objectives" }: Tally = {},
): ShareTable {
  const counted = new Map<string, number>();
  const inRuns = new Map<string, Set<number>>();
  for (const key of universe) counted.set(key, 0);
  let showings = 0;
  for (const one of objectives) {
    const keys = keysOf(one);
    for (const key of basis === "objectives" ? new Set(keys) : keys) {
      showings += 1;
      counted.set(key, (counted.get(key) ?? 0) + 1);
      inRuns.set(key, (inRuns.get(key) ?? new Set()).add(one.run));
    }
  }
  const total = basis === "objectives" ? objectives.length : showings;
  const runs = sample.results.length;
  const rows = [...counted]
    .map(([key, count]) => ({
      key,
      name: name(key),
      count,
      perRun: count / runs,
      share: total === 0 ? 0 : count / total,
      seenIn: (inRuns.get(key)?.size ?? 0) / runs,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total, runs, rows, ...(basis === "showings" ? { unit: "showings" as const } : {}) };
}

const chosenKeys =
  (slots: readonly LoadoutSlot[], test: (roll: RollRow) => boolean = () => true) =>
  (one: Obj): string[] =>
    slots.flatMap((slot) => {
      const roll = one.rolls.get(slot);
      return roll !== undefined && roll.chosenKey !== null && test(roll) ? [roll.chosenKey] : [];
    });

interface ChanceEntry {
  readonly slot: LoadoutSlot;
  readonly key: string;
  readonly stretch: number;
}

/** The picked classes' chance sums, added up into rows by `group`, undefined leaving an entry out. Every reading of
 * `ChanceSums` goes through here, so every chart adds up alike. */
function foldChances(
  sample: Sample,
  chances: ChanceSums | undefined,
  group: (entry: ChanceEntry) => string | undefined,
): ReadonlyMap<string, ChanceSum> {
  const rows = new Map<string, ChanceSum>();
  if (chances === undefined) return rows;
  const picked = new Set(sample.classes);
  for (const [at, sum] of chances) {
    const { characterClass, slot, key, stretch } = readChanceKey(at);
    if (!picked.has(characterClass)) continue;
    const row = group({ slot, key, stretch });
    if (row === undefined) continue;
    const total = rows.get(row) ?? { chance: 0, plain: 0, boosted: 0, rolls: 0 };
    total.chance += sum.chance;
    total.plain += sum.plain;
    total.boosted += sum.boosted;
    total.rolls += sum.rolls;
    rows.set(row, total);
  }
  return rows;
}

/** The items an option key stands for: an alias's members, or the item itself. */
function membersOf(data: EngineData, key: string): readonly Item[] {
  const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
  if (kind === "alias") return data.database.item.filter((row) => row.alias === id);
  const item = kind === "item" ? data.items.get(id) : undefined;
  return item === undefined ? [] : [item];
}

function chosenItem(data: EngineData, roll: RollRow | undefined) {
  return roll?.chosen === null || roll?.chosen === undefined ? undefined : data.items.get(roll.chosen);
}

/** Options of the classes' pools for these slots that some roll of that class offered, so a table can list what was
 * in reach and never showed; with `offeredOnly` false, every option the pools hold at odds above 0. */
function inReach(
  sample: Sample,
  classes: readonly string[],
  slots: readonly LoadoutSlot[],
  offeredOnly = true,
): Option[] {
  const found: Option[] = [];
  for (const characterClass of classes) {
    const offered = new Set(sample.results.flatMap((result) => [...(result.offered.get(characterClass) ?? [])]));
    for (const slot of slots) {
      for (const option of slotOptions(sample.data, characterClass, slot)) {
        if (option.row.odds > 0 && (!offeredOnly || offered.has(repeatKey(option)))) found.push(option);
      }
    }
  }
  return found;
}

/** An item's weapon or shield class, or its category where it has none. */
function classOfItem(item: Item): string {
  return item.subcategory ?? item.category;
}

/** A weapon class, a shield class or a category: what the hand holds, `none` for an empty one. */
function handClass(data: EngineData, roll: RollRow | undefined): string | undefined {
  const item = chosenItem(data, roll);
  return item === undefined ? undefined : classOfItem(item);
}

/** Pools whose only possible roll is `none`: a bare pick, never a gap. */
function alwaysNone(data: EngineData, characterClass: string, slot: LoadoutSlot): boolean {
  const options = slotOptions(data, characterClass, slot);
  return options.length === 1 && isNone(options[0]!.row.id);
}

function poolSizes(data: EngineData, characterClass: string, slot: LoadoutSlot): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const option of slotOptions(data, characterClass, slot)) {
    if (option.kind !== "item" || option.row.odds <= 0) continue;
    const key = classOfItem(option.row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** A hand counted by weapon class, or by the weapon itself. */
type HandView = "class" | "weapon";

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
    return shareTable(sample, inClasses, chosenKeys([slot]), (key) => nameOf(data, key), { universe });
  }
  const table = shareTable(
    sample,
    inClasses,
    (one) => {
      const key = handClass(data, one.rolls.get(slot));
      return key === undefined ? [] : [key];
    },
    humanise,
    {
      universe: inReach(sample, classes, [slot]).flatMap((option) =>
        option.kind === "item" ? [classOfItem(option.row)] : [],
      ),
    },
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

interface Pairs {
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

/** The two ash tables: an ash counts by the hand that rolled it, so one fitting both, such as `Parry`, counts in each
 * where it rolled. */
type AshTable = "weaponAsh" | "shieldAsh";

const ASH_SLOTS: readonly LoadoutSlot[] = ["rh_ash", "lh_ash"];

function isAshTable(table: string): table is AshTable {
  return table === "weaponAsh" || table === "shieldAsh";
}

function onTable(one: Obj, slot: LoadoutSlot, table: AshTable, data: EngineData): boolean {
  return ashOnShield(data, one.row.slots, slot) === (table === "shieldAsh");
}

/** Options of the classes' pools for these slots that a pool of that class offered, each by itself rather than by its
 * alias, and for an ash table only those offered to a hand of its kind. */
function reachedOptions(sample: Sample, classes: readonly string[], slots: readonly LoadoutSlot[], ash?: AshTable): Option[] {
  const found: Option[] = [];
  for (const characterClass of classes) {
    const reached = new Set(
      sample.results.flatMap((result) => {
        const row = result.reached.get(characterClass);
        if (row === undefined) return [];
        return [...(ash === undefined ? row.options : ash === "shieldAsh" ? row.shieldAshes : row.weaponAshes)];
      }),
    );
    for (const slot of slots) {
      for (const option of slotOptions(sample.data, characterClass, slot)) {
        if (option.row.odds > 0 && reached.has(optionKey(option))) found.push(option);
      }
    }
  }
  return found;
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
    const universe = inReach(sample, classes, ["spell"]).map(repeatKey);
    return shareTable(sample, objectives, chosenKeys(["spell"]), name, { universe });
  }
  const universe = {
    weaponAsh: reachedOptions(sample, sample.classes, ASH_SLOTS, "weaponAsh"),
    shieldAsh: reachedOptions(sample, sample.classes, ASH_SLOTS, "shieldAsh"),
    item: inReach(sample, sample.classes, ["item"]),
    talisman: inReach(sample, sample.classes, ["talisman_1", "talisman_2"]),
    rule: inReach(sample, sample.classes, ["rule_1", "rule_2"]),
    armor: inReach(sample, sample.classes, ["armor"]),
  }[table].map(repeatKey);
  const ashKeys = (ash: AshTable) => (one: Obj) =>
    ASH_SLOTS.filter((slot) => onTable(one, slot, ash, data)).flatMap((slot) => chosenKeys([slot])(one));
  const keysOf = {
    weaponAsh: ashKeys("weaponAsh"),
    shieldAsh: ashKeys("shieldAsh"),
    item: chosenKeys(["item"]),
    talisman: chosenKeys(["talisman_1", "talisman_2"]),
    rule: chosenKeys(["rule_1", "rule_2"]),
    armor: chosenKeys(["armor"]),
  }[table];
  return shareTable(sample, sample.objectives, keysOf, name, { universe });
}

// Overview

interface RunSummary {
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
  const levels = results.map((result) => derivedLevel(result.finalStats));
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
    { universe: sample.classes.map((id) => `character_class:${id}`) },
  );
  return { ...table, rows: table.rows.filter((row) => sample.classes.includes(row.key.slice("character_class:".length))) };
}

interface RuleNone {
  readonly total: number;
  readonly neither: number;
  readonly one: number;
  readonly both: number;
}

/** How many of an objective's two rule slots show `None`. */
export function ruleNone(sample: Sample): RuleNone {
  const counts = [0, 0, 0];
  for (const objective of sample.objectives) {
    const nones = (["rule_1", "rule_2"] as const).filter((slot) => isNone(objective.rolls.get(slot)?.chosen ?? "")).length;
    counts[nones]! += 1;
  }
  return { total: sample.objectives.length, neither: counts[0]!, one: counts[1]!, both: counts[2]! };
}

interface NeverRolled {
  /** In a pool of a picked class at some point, never shown. */
  readonly inReach: readonly string[];
  /** In none of their pools under these settings. */
  readonly outOfReach: readonly string[];
}

export function neverRolled(sample: Sample): NeverRolled {
  const { data } = sample;
  const slots = [...POOL_SLOTS, "armor"] as LoadoutSlot[];
  const universe = new Set(inReach(sample, sample.classes, slots, false).map(repeatKey));
  const offered = new Set(inReach(sample, sample.classes, slots).map(repeatKey));
  const chosen = new Set(sample.objectives.flatMap((one) => [...one.rolls.values()].map((roll) => roll.chosenKey ?? "")));
  const names = (keys: string[]) => keys.map((key) => nameOf(data, key)).sort((a, b) => a.localeCompare(b));
  return {
    inReach: names([...universe].filter((key) => offered.has(key) && !chosen.has(key))),
    outOfReach: names([...universe].filter((key) => !offered.has(key))),
  };
}

const REPEAT_KINDS = ["class", "rh", "lh", "ash", "spell", "item", "talisman", "rule", "armor"] as const;
type RepeatKind = (typeof REPEAT_KINDS)[number];

const notNone = (roll: RollRow) => !isNone(roll.chosen ?? "");
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

const ASH_HANDS: Partial<Record<LoadoutSlot, LoadoutSlot>> = { rh_ash: "rh", lh_ash: "lh" };

/** Whether the hand an ash slot belongs to holds something some ash fits: a somber weapon, a catalyst or an empty
 * hand rolls no ash by design. */
function takesAnAsh(data: EngineData, one: Obj, slot: LoadoutSlot): boolean {
  const hand = ASH_HANDS[slot];
  if (hand === undefined) return true;
  const item = chosenItem(data, one.rolls.get(hand));
  return item !== undefined && [...data.ashFits.keys()].some((ash) => ashFits(data, ash, item));
}

/** Rolls that found nothing, not even `none`, where `none` isn't the only possible roll and, for an ash, its hand
 * could hold one. */
export function empties(sample: Sample): readonly EmptyRow[] {
  const counts = new Map<string, EmptyRow>();
  for (const one of sample.objectives) {
    for (const [slot, roll] of one.rolls) {
      if (roll.chosen !== null || alwaysNone(sample.data, one.row.characterClass, slot)) continue;
      if (!takesAnAsh(sample.data, one, slot)) continue;
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

// By region

/** Every share table but the combat rules', which have no location. */
export type RegionTable = "rh" | "lh" | Exclude<GearTable, "rule">;

/** Every table by region, in the page's order. */
export const REGION_TABLES: readonly RegionTable[] = ["rh", "lh", "spell", "weaponAsh", "shieldAsh", "item", "talisman", "armor"];

const REGION_SLOTS: Readonly<Record<RegionTable, readonly LoadoutSlot[]>> = {
  rh: ["rh"],
  lh: ["lh"],
  spell: ["spell"],
  weaponAsh: ["rh_ash", "lh_ash"],
  shieldAsh: ["rh_ash", "lh_ash"],
  item: ["item"],
  talisman: ["talisman_1", "talisman_2"],
  armor: ["armor"],
};

/** The key of a table's region with no location. */
export const NO_LOCATION = "";

const firstRegions = new WeakMap<EngineData, ReadonlyMap<string, string>>();

/** By `optionKey`: the region in play order where an item first comes into reach, and where a set's last piece
 * does. Items with no location row are left out. */
function regionsOf(data: EngineData): ReadonlyMap<string, string> {
  const cached = firstRegions.get(data);
  if (cached !== undefined) return cached;
  const { database } = data;
  const rank = playRank(database);
  const locationRegion = new Map(database.location.map((row) => [row.id, row.region_id]));
  const items = new Map<string, string>();
  for (const row of database.item_location) {
    const location = row.location_id ?? data.bosses.get(row.boss_instance_id ?? "")?.location_id;
    const region = location === undefined ? undefined : locationRegion.get(location);
    if (region === undefined) continue;
    const current = items.get(row.item_id);
    if (current === undefined || (rank.get(region) ?? 0) < (rank.get(current) ?? 0)) items.set(row.item_id, region);
  }
  const found = new Map<string, string>([...items].map(([id, region]) => [`item:${id}`, region]));
  for (const set of database.armor_set) {
    const regions = set.pieces.flatMap((piece) => (items.has(piece) ? [items.get(piece)!] : []));
    if (regions.length > 0) found.set(`armor_set:${set.id}`, regions.reduce((a, b) => ((rank.get(a) ?? 0) >= (rank.get(b) ?? 0) ? a : b)));
  }
  firstRegions.set(data, found);
  return found;
}

/** The region an option key counts in: an item's first, a set's last piece's, an alias's earliest member's in play
 * order, or `NO_LOCATION`. */
function regionOfKey(data: EngineData, key: string): string {
  const regions = regionsOf(data);
  if (!key.startsWith("alias:")) return regions.get(key) ?? NO_LOCATION;
  const rank = playRank(data.database);
  const found = membersOf(data, key).flatMap((item) => {
    const region = regions.get(`item:${item.id}`);
    return region === undefined ? [] : [region];
  });
  return found.length === 0 ? NO_LOCATION : found.reduce((a, b) => ((rank.get(b) ?? 0) < (rank.get(a) ?? 0) ? b : a));
}

/** A slot's showings by the region each first comes into reach in, `none` left out, every roll counted, so two
 * talisman slots count twice. `adjusted` is the share a region would get if every option in reach showed equally,
 * so a skew from how many items a region holds reads apart from the rest. */
export function regionShares(sample: Sample, table: RegionTable): ShareTable | null {
  const { data } = sample;
  const slots = REGION_SLOTS[table];
  const single = slots.length === 1 ? slots[0]! : undefined;
  const classes = single === undefined ? sample.classes : sample.classes.filter((id) => !alwaysNone(data, id, single));
  if (classes.length === 0) return null;
  const ash = isAshTable(table) ? table : undefined;
  const regionOf = (key: string) => regionOfKey(data, key);
  const rank = playRank(data.database);
  const orderOf = (region: string) => (rank.get(region) ?? -1) + 1;
  const reach = new Map<string, string>();
  for (const option of reachedOptions(sample, classes, slots, ash)) {
    if (!isNone(option.row.id)) reach.set(optionKey(option), regionOf(optionKey(option)));
  }
  const options = new Map<string, number>();
  for (const region of reach.values()) options.set(region, (options.get(region) ?? 0) + 1);
  const shares = shareTable(
    sample,
    sample.objectives.filter((one) => classes.includes(one.row.characterClass)),
    (one) =>
      slots.flatMap((slot) => {
        const chosen = one.rolls.get(slot)?.chosen;
        if (chosen === null || chosen === undefined || isNone(chosen)) return [];
        if (ash !== undefined && !onTable(one, slot, ash, data)) return [];
        return [regionOf(`${slot === "armor" ? "armor_set" : "item"}:${chosen}`)];
      }),
    (region) => (region === NO_LOCATION ? NO_LOCATION : regionName(data, region)),
    { universe: options.keys(), basis: "showings" },
  );
  const groups = new Set<string>(ash === undefined ? slots : [ash]);
  const rollable = new Map<string, number>();
  let rollableTotal = 0;
  for (const result of sample.results) {
    for (const [at, value] of result.rollable) {
      const [characterClass = "", group = "", key = ""] = at.split("|");
      if (!classes.includes(characterClass) || !groups.has(group)) continue;
      const region = regionOf(key);
      rollable.set(region, (rollable.get(region) ?? 0) + value);
      rollableTotal += value;
    }
  }
  return {
    ...shares,
    rows: shares.rows.map((row) => ({
      ...row,
      adjusted: (options.get(row.key) ?? 0) / Math.max(1, reach.size),
      rollable: rollableTotal > 0 ? (rollable.get(row.key) ?? 0) / rollableTotal : 0,
      ...(row.key === NO_LOCATION ? {} : { order: orderOf(row.key) }),
    })),
  };
}

// Boosts

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
export function oddsOf(data: EngineData, key: string): number {
  const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
  if (kind === "item") return data.items.get(id)?.odds ?? 0;
  if (kind === "alias") return data.database.item.filter((row) => row.alias === id).reduce((sum, row) => sum + row.odds, 0);
  if (kind === "rule") return data.rules.get(id)?.odds ?? 0;
  if (kind === "armor_set") return data.armorSets.get(id)?.odds ?? 0;
  return 0;
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
    const { characterClass, key } = readChanceKey(at);
    if (picked.has(characterClass)) keys.add(key);
  }
  return [...keys].map((key) => ({ key, name: nameOf(sample.data, key) }));
}

interface ItemPoint {
  /** The stretch's first objective number. */
  readonly x: number;
  /** Mean chance per roll in the stretch, with the catch-up boost and with it removed from every option. */
  readonly chance: number;
  readonly plain: number;
  /** The mean catch-up boost on it in the stretch. */
  readonly catchUp: number;
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
  const bySlot = new Map<LoadoutSlot, Map<number, ChanceSum>>();
  const folded = foldChances(sample, chances, (entry) => (entry.key === key ? `${entry.slot}|${entry.stretch}` : undefined));
  for (const [row, total] of folded) {
    const [slot = "", stretch = ""] = row.split("|");
    const stretches = bySlot.get(slot as LoadoutSlot) ?? new Map<number, ChanceSum>();
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
          shown: mean(counts),
        };
      }),
  }));
}


// Furthest from fair

/** Vs fair inside this range reads as even. */
export const EVEN = { low: 0.8, high: 1.25 } as const;
/** A gap smaller than this many showings a run is no concern for play, however far from 1 its Vs fair reads. */
export const MIN_GAP_PER_RUN = 0.5;
/** A gap must pass this many standard deviations of its sample to count as more than luck: one build's view holds
 * hundreds of lines, so at three about one is listed by luck alone. A line's showings vary from run to run no more
 * than chance alone would make them, so the standard deviation of its showings over the sample is √(fair showings). */
export const LUCK_DEVIATIONS = 3;
/** Region tables Furthest from fair reads: the item slot's shares follow odds that differ by design, so its Vs fair
 * says little. */
export const FAIR_TABLES: readonly RegionTable[] = REGION_TABLES.filter((table) => table !== "item");

/** One region of one slot, for one class alone or several summed. */
export interface FairLine {
  readonly classes: readonly string[];
  readonly table: RegionTable;
  readonly key: string;
  readonly region: string;
  readonly order: number | undefined;
  /** Showings over the whole sample. */
  readonly shown: number;
  /** Showings over the whole sample at its fair share. */
  readonly fair: number;
  /** A sum of classes beside one or more classes of the same slot and region listed alone. */
  readonly others?: boolean;
}

/** The sample as one class alone would read it, over the same runs. */
function forClass(sample: Sample, characterClass: string): Sample {
  return { ...sample, objectives: sample.all.filter((one) => one.row.characterClass === characterClass), classes: [characterClass] };
}

/** Every region of the region tables for each picked class alone; `No location` and regions with no fair share are
 * left out. */
export function fairLines(sample: Sample, tables: readonly RegionTable[]): readonly FairLine[] {
  const lines: FairLine[] = [];
  for (const characterClass of sample.classes) {
    const own = forClass(sample, characterClass);
    for (const table of tables) {
      const shares = regionShares(own, table);
      if (shares === null) continue;
      for (const row of shares.rows) {
        const fair = row.adjusted ?? 0;
        if (row.key === NO_LOCATION || fair === 0) continue;
        lines.push({
          classes: [characterClass],
          table,
          key: row.key,
          region: row.name,
          order: row.order,
          shown: row.share * shares.total,
          fair: fair * shares.total,
        });
      }
    }
  }
  return lines;
}

/** Showings over the sample above (+) or below (−) the fair share. */
export function gap(line: FairLine): number {
  return line.shown - line.fair;
}

/** How far a Vs fair is from even on a log scale, so half and double are as far: how every Vs fair column sorts, worst
 * first. One that never showed is furthest; one with no fair share sorts last. */
export function fairDistance(vs: number): number {
  return vs > 0 ? Math.abs(Math.log2(vs)) : vs === 0 ? Infinity : NaN;
}

/** Off even, by at least `MIN_GAP_PER_RUN` showings a run, and by more than luck can explain over `runs`. */
function matters(line: FairLine, runs: number): boolean {
  const vs = line.shown / line.fair;
  const off = Math.abs(gap(line));
  return (vs < EVEN.low || vs > EVEN.high) && off >= MIN_GAP_PER_RUN * runs && off > LUCK_DEVIATIONS * Math.sqrt(line.fair);
}

/** The lines whose gap matters for play, largest first: each class line that passes alone, then for each slot and
 * region the classes that don't, summed (each against its own fair share), if their sum passes. Nothing counts twice,
 * and a shortfall every class shares shows though no class is short enough alone. */
export function worstLines(lines: readonly FairLine[], runs: number): readonly FairLine[] {
  const listed: FairLine[] = [];
  const rest = new Map<string, FairLine[]>();
  const alone = new Set<string>();
  for (const line of lines) {
    const at = `${line.table}/${line.key}`;
    if (matters(line, runs)) {
      listed.push(line);
      alone.add(at);
    } else rest.set(at, [...(rest.get(at) ?? []), line]);
  }
  for (const [at, group] of rest) {
    if (group.length < 2) continue;
    const summed: FairLine = {
      ...group[0]!,
      classes: group.map((line) => line.classes[0]!),
      shown: group.reduce((sum, line) => sum + line.shown, 0),
      fair: group.reduce((sum, line) => sum + line.fair, 0),
      others: alone.has(at),
    };
    if (matters(summed, runs)) listed.push(summed);
  }
  return listed.sort((a, b) => Math.abs(gap(b)) - Math.abs(gap(a)));
}
