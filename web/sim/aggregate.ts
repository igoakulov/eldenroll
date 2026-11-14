// What the simulation page shows, counted from the rows a run records (web/sim/README.md#The page). Words are
// the page's: this returns ids, game names and numbers.
import type { Condition, LoadoutSlot, Modifier, Selector } from "../src/engine/database";
import { POOL_SLOTS } from "../src/engine/database";
import type { EngineData } from "../src/engine/engineData";
import { STATS, type Stat } from "../src/engine/settings";
import { catchUpMultiplier, repeatKey, slotOptions } from "../src/engine/slotRoll";
import type { Option } from "../src/engine/selectors";
import { DEFAULT_HYPERPARAMS } from "../src/engine/hyperparams";
import {
  BUCKET,
  CHANCE_SLOTS,
  GUARANTEE,
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
/** The acceptance for a guarantee (`data/balance.md#Tiers`). */
export const ACCEPTANCE = 0.99;

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
  /** 0 to 1, of the table's objectives. */
  readonly share: number;
  /** The share if every weapon class held as many weapons, where it applies. */
  readonly adjusted?: number;
}

export interface ShareTable {
  readonly total: number;
  readonly rows: readonly ShareRow[];
}

/** `universe` adds a row at 0 for each key that never showed. */
function shareTable(
  objectives: readonly Obj[],
  keysOf: (one: Obj) => readonly string[],
  name: (key: string) => string,
  universe: Iterable<string> = [],
): ShareTable {
  const counted = new Map<string, number>();
  for (const key of universe) counted.set(key, 0);
  for (const one of objectives) for (const key of new Set(keysOf(one))) counted.set(key, (counted.get(key) ?? 0) + 1);
  const total = objectives.length;
  const rows = [...counted]
    .map(([key, count]) => ({ key, name: name(key), count, share: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total, rows };
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

/** A hand by weapon class, each share beside the one it would have if every class held the same number of
 * weapons, so a skew from pool size reads apart from one from catch-up, stat gates or a modifier. With several
 * classes picked, each class's adjusted shares count by its objectives. */
export function handShares(sample: Sample, slot: "rh" | "lh"): ShareTable | null {
  const { data } = sample;
  const classes = sample.classes.filter((id) => !alwaysNone(data, id, slot));
  if (classes.length === 0) return null;
  const inClasses = sample.objectives.filter((one) => classes.includes(one.row.characterClass));
  const table = shareTable(
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
  const counted = new Map<string, { rh: string; lh: string; count: number }>();
  let same = 0;
  let both = 0;
  for (const one of sample.objectives) {
    const rh = handClass(data, one.rolls.get("rh"));
    const lh = handClass(data, one.rolls.get("lh"));
    if (rh === undefined || lh === undefined) continue;
    const key = `${rh}+${lh}`;
    const row = counted.get(key) ?? { rh, lh, count: 0 };
    row.count += 1;
    counted.set(key, row);
    const rhItem = chosenItem(data, one.rolls.get("rh"));
    const lhItem = chosenItem(data, one.rolls.get("lh"));
    if (rhItem?.category === "weapon" && lhItem?.category === "weapon") {
      both += 1;
      if (rh === lh) same += 1;
    }
  }
  const total = sample.objectives.length;
  const rows = [...counted]
    .map(([key, row]) => ({
      key,
      name: `${humanise(row.rh)} + ${humanise(row.lh)}`,
      rh: humanise(row.rh),
      lh: humanise(row.lh),
      count: row.count,
      share: total === 0 ? 0 : row.count / total,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total, rows, sameClass: { count: same, of: both } };
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
    return shareTable(objectives, chosenKeys(["spell"]), name, inReach(sample, classes, ["spell"]).map(repeatKey));
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
  return shareTable(sample.objectives, keysOf, name, universe);
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
    return { kind, showings, gap: mean(gaps), soon: showings === 0 ? 0 : gaps.filter((gap) => gap <= SOON).length / showings };
  });
}

export interface EmptyRow {
  readonly characterClass: string;
  readonly slot: LoadoutSlot;
  readonly count: number;
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
      const row = counts.get(key) ?? { characterClass: one.row.characterClass, slot, count: 0, share: 0 };
      counts.set(key, { ...row, count: row.count + 1 });
    }
  }
  const total = sample.objectives.length;
  return [...counts.values()].map((row) => ({ ...row, share: row.count / total })).sort((a, b) => b.count - a.count);
}

// Boosts

export interface CatchUpRow {
  readonly key: string;
  readonly count: number;
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
      return { key, count: list.length, share: list.length / rolls.length, catchUp: mean(list.map((roll) => roll.catchUp)) };
    });
}

export interface BoostRow {
  readonly modifier: ModifierText;
  /** Rolls where it boosted an option in the pool. */
  readonly active: number;
  /** Rolls a boosted option won. */
  readonly won: number;
  /** The boosted options' mean summed chance at roll time. */
  readonly chance: number;
  /** For a guarantee: what won instead, most often first. */
  readonly lostTo: readonly { readonly name: string; readonly count: number }[];
}

/** Every boosting modifier in play for the picked classes: guarantees (×100,000 or more) first. */
export function boosts(sample: Sample): { readonly guarantees: readonly BoostRow[]; readonly others: readonly BoostRow[] } {
  const { data } = sample;
  const stats = new Map<string, { active: number; won: number; chance: number[]; lost: Map<string, number> }>();
  for (const one of sample.objectives) {
    for (const roll of one.rolls.values()) {
      roll.boosts.forEach((id, index) => {
        const row = stats.get(id) ?? { active: 0, won: 0, chance: [] as number[], lost: new Map<string, number>() };
        row.active += 1;
        row.chance.push(roll.boostChances[index]!);
        if (roll.chosenBoosts.includes(id)) row.won += 1;
        else {
          const key = roll.chosenKey === null ? "" : nameOf(data, roll.chosenKey);
          row.lost.set(key, (row.lost.get(key) ?? 0) + 1);
        }
        stats.set(id, row);
      });
    }
  }
  const rows = data.database.modifier.flatMap((modifier): BoostRow[] => {
    const row = stats.get(modifier.id);
    if (modifier.value <= 1 || row === undefined) return [];
    return [
      {
        modifier: modifierText(data, modifier),
        active: row.active,
        won: row.won,
        chance: mean(row.chance),
        lostTo: [...row.lost].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      },
    ];
  });
  return {
    guarantees: rows.filter((row) => row.modifier.value >= GUARANTEE),
    others: rows.filter((row) => row.modifier.value < GUARANTEE),
  };
}

/** The planned synergies, each a chain of modifiers (data/balance.md#Conditional rules). */
export const SYNERGIES = [
  ["bleed_boosts_blood_exultation", "blood_exultation_boosts_white_mask_sets"],
  ["rot_boosts_kindred_exultation", "kindred_exultation_boosts_mushroom_sets"],
  ["claw_talisman_makes_jump_attacks_top", "jump_attacks_rule_boosts_jump_sets"],
  ["dancers_weapon_makes_dancers_set_top"],
  ["blue_dancer_charm_boosts_light_sets"],
  ["blue_dancer_charm_boosts_no_armor"],
] as const;

export interface SynergyStep {
  readonly modifier: ModifierText;
  /** Objectives where its trigger held. */
  readonly triggered: number;
  /** Of those, objectives where its target rolled. */
  readonly landed: number;
}

/** Counted per objective: a talisman boost is active in both talisman slots. */
export function synergies(sample: Sample): readonly (readonly SynergyStep[])[] {
  const { data } = sample;
  const active = (one: Obj, id: string) => [...one.rolls.values()].some((roll) => roll.boosts.includes(id));
  const won = (one: Obj, id: string) => [...one.rolls.values()].some((roll) => roll.chosenBoosts.includes(id));
  return SYNERGIES.map((chain) =>
    chain.flatMap((id) => {
      const modifier = data.database.modifier.find((row) => row.id === id);
      if (modifier === undefined) return [];
      const triggered = sample.objectives.filter((one) => active(one, id));
      return [{ modifier: modifierText(data, modifier), triggered: triggered.length, landed: triggered.filter((one) => won(one, id)).length }];
    }),
  ).filter((chain) => chain.length > 0);
}

export const OUT_OF_PLACE = ["lord_of_bloods_exultation", "kindred_of_rots_exultation", "blue_dancer_charm", "claw_talisman", "axe_talisman"] as const;
export type OutOfPlace = (typeof OUT_OF_PLACE)[number];

/** Of objectives showing a synergy talisman, those where its synergy didn't hold: for the exultations, no boost
 * brought it in; the Blue Dancer Charm with armor its boosts didn't bring; the Claw and Axe Talismans without
 * their rule. */
export function outOfPlace(sample: Sample): readonly { readonly id: OutOfPlace; readonly name: string; readonly shown: number; readonly out: number }[] {
  const { data } = sample;
  const won = (one: Obj, id: string) => [...one.rolls.values()].some((roll) => roll.chosenBoosts.includes(id));
  const shown = (one: Obj, id: string) =>
    (["talisman_1", "talisman_2"] as const).map((slot) => one.rolls.get(slot)).find((roll) => roll?.chosen === id);
  const tests: Readonly<Record<OutOfPlace, (one: Obj) => boolean>> = {
    lord_of_bloods_exultation: (one) => (shown(one, "lord_of_bloods_exultation")?.chosenBoosts.length ?? 0) === 0,
    kindred_of_rots_exultation: (one) => (shown(one, "kindred_of_rots_exultation")?.chosenBoosts.length ?? 0) === 0,
    blue_dancer_charm: (one) =>
      !(one.rolls.get("armor")?.chosenBoosts.some((id) => id.startsWith("blue_dancer_charm_boosts")) ?? false),
    claw_talisman: (one) => !won(one, "claw_talisman_makes_jump_attacks_top"),
    axe_talisman: (one) => !won(one, "axe_talisman_makes_charged_rules_top"),
  };
  return OUT_OF_PLACE.map((id) => {
    const showing = sample.objectives.filter((one) => shown(one, id) !== undefined);
    return { id, name: data.items.get(id)?.name ?? id, shown: showing.length, out: showing.filter(tests[id]).length };
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
  /** Slots it was in reach in for the picked classes, in `CHANCE_SLOTS` order. */
  readonly slots: readonly LoadoutSlot[];
  readonly odds: number;
  readonly ceiling: number | null;
  readonly shownPerRun: number;
  /** Runs it showed in at least once. */
  readonly seenIn: number;
}

/** Every option in reach for the picked classes, with how often it showed. */
export function items(sample: Sample, chances: ChanceSums): readonly ItemRow[] {
  const { data } = sample;
  const picked = new Set(sample.classes);
  const slotsOf = new Map<string, Set<LoadoutSlot>>();
  for (const at of chances.keys()) {
    const [characterClass = "", slot = "", key = ""] = at.split("|");
    if (!picked.has(characterClass)) continue;
    const slots = slotsOf.get(key) ?? new Set<LoadoutSlot>();
    slots.add(slot as LoadoutSlot);
    slotsOf.set(key, slots);
  }
  const shown = showings(sample);
  const runs = sample.results.length;
  return [...slotsOf].map(([key, slots]) => {
    const perRun = shown.get(key) ?? sample.results.map(() => []);
    return {
      key,
      name: nameOf(data, key),
      slots: CHANCE_SLOTS.filter((slot) => slots.has(slot)),
      odds: baseOdds(data, key),
      ceiling: ceilingOf(data, key),
      shownPerRun: perRun.reduce((sum, objectives) => sum + objectives.length, 0) / runs,
      seenIn: perRun.filter((objectives) => objectives.length > 0).length,
    };
  });
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
