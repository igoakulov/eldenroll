// The run view's `Summary` tab, worked out when the view opens (web/README.md#Summary).
import { isNone, type Item } from "../engine/database";
import type { EngineData } from "../engine/engineData";
import type { RunRecord } from "../save/finished";

/** A catalyst's class attacks with spells, so its label says nothing about the weapon (web/README.md#Summary). */
const SPELL_CATALYSTS: ReadonlySet<string> = new Set(["any_staff", "any_seal"]);

const MOST_REROLLED = 10;

export const GEAR_KINDS = ["weapons", "shields", "sorceries", "incantations", "armor_sets", "shortlist"] as const;
export type GearKind = (typeof GEAR_KINDS)[number];

type RerolledKind =
  | "boss"
  | "character_class"
  | "weapon"
  | "shield"
  | "sorcery"
  | "incantation"
  | "talisman"
  | "item"
  | "armor_set"
  | "rule";

/** An alias's members share one entry, under the alias's id and label. */
export interface Entry {
  readonly id: string;
  readonly name: string;
}

export interface Counted extends Entry {
  readonly count: number;
}

export interface Rerolled extends Counted {
  /** `null` for an id gone from the data. */
  readonly kind: RerolledKind | null;
}

interface SkippedBoss extends Entry {
  readonly location: string | null;
}

export interface Summary {
  readonly objectives: number;
  readonly bossesFelled: number;
  readonly rerolls: number;
  readonly skipped: readonly SkippedBoss[];
  /** Every class with a completed objective, most first. */
  readonly topClasses: readonly Counted[];
  /** A–Z. */
  readonly gear: Readonly<Record<GearKind, readonly Entry[]>>;
  /** Every gear entry but the shortlist's, which are weapons already counted. */
  readonly uniqueGear: number;
  readonly mostRerolled: readonly Rerolled[];
}

/** An id gone from the data: `margit_the_fell_omen_stormveil_castle` as `Margit The Fell Omen Stormveil Castle`. */
export function nameFromId(id: string): string {
  return id
    .split("_")
    .filter((word) => word !== "")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name, "en");
const byCount = (a: Counted, b: Counted) => b.count - a.count || byName(a, b);

function itemEntry(data: EngineData, item: Item): Entry {
  const alias = item.alias === null ? undefined : data.aliases.get(item.alias);
  return alias === undefined ? { id: item.id, name: item.name } : { id: alias.id, name: alias.label };
}

const ITEM_KINDS: Readonly<Partial<Record<Item["category"], RerolledKind>>> = {
  weapon: "weapon",
  shield: "shield",
  sorcery: "sorcery",
  incantation: "incantation",
  talisman: "talisman",
  consumable: "item",
  tool: "item",
};

/** What a replaced id names; `null` for `none` and `any`, which never count. */
function rerolledEntry(data: EngineData, id: string): (Entry & { readonly kind: RerolledKind | null }) | null {
  if (isNone(id)) return null;
  const boss = data.bosses.get(id);
  if (boss !== undefined) return { id, name: boss.name, kind: "boss" };
  const characterClass = data.database.character_class.find((row) => row.id === id);
  if (characterClass !== undefined) return { id, name: characterClass.name, kind: "character_class" };
  const set = data.armorSets.get(id);
  if (set !== undefined) return { id, name: set.name, kind: "armor_set" };
  const rule = data.rules.get(id);
  if (rule !== undefined) return { id, name: rule.name, kind: "rule" };
  const item = data.items.get(id);
  if (item === undefined) return { id, name: nameFromId(id), kind: null };
  const kind = ITEM_KINDS[item.category];
  return kind === undefined ? null : { ...itemEntry(data, item), kind };
}

function uniqueSorted(entries: readonly Entry[]): readonly Entry[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort(byName);
}

/** Only completed objectives count; `none` and `any` never do. An id gone from the data can't be sorted into a gear
 * kind, so only the rerolls name it. */
export function summarize(data: EngineData, record: RunRecord): Summary {
  const gear: Record<GearKind, Entry[]> = {
    weapons: [],
    shields: [],
    sorceries: [],
    incantations: [],
    armor_sets: [],
    shortlist: [],
  };
  const classes = new Map<string, number>();
  for (const objective of record.objectives) {
    classes.set(objective.characterClass, (classes.get(objective.characterClass) ?? 0) + 1);
    const item = (id: string | null | undefined) =>
      id === null || id === undefined || isNone(id) ? undefined : data.items.get(id);
    for (const hand of ["rh", "lh"] as const) {
      const held = item(objective.slots[hand]);
      if (held?.category === "weapon" && !SPELL_CATALYSTS.has(held.alias ?? "")) gear.weapons.push(itemEntry(data, held));
      if (held?.category === "shield") gear.shields.push(itemEntry(data, held));
    }
    const spell = item(objective.slots.spell);
    if (spell?.category === "sorcery") gear.sorceries.push(itemEntry(data, spell));
    if (spell?.category === "incantation") gear.incantations.push(itemEntry(data, spell));
    const armor = objective.slots.armor;
    const set = armor === null || armor === undefined ? undefined : data.armorSets.get(armor);
    if (set !== undefined) gear.armor_sets.push({ id: set.id, name: set.name });
    const rh = item(objective.slots.rh);
    if (objective.shortlistRh && rh !== undefined) gear.shortlist.push(itemEntry(data, rh));
  }
  const sorted = Object.fromEntries(GEAR_KINDS.map((kind) => [kind, uniqueSorted(gear[kind])])) as Record<
    GearKind,
    readonly Entry[]
  >;

  const rerolled = new Map<string, Rerolled>();
  for (const [id, times] of Object.entries(record.replaced)) {
    const entry = rerolledEntry(data, id);
    if (entry === null) continue;
    const before = rerolled.get(entry.id);
    rerolled.set(entry.id, { ...entry, count: (before?.count ?? 0) + times });
  }

  const className = (id: string) => data.database.character_class.find((row) => row.id === id)?.name ?? nameFromId(id);
  return {
    objectives: record.objectives.length,
    bossesFelled: record.deadBosses.length,
    rerolls: record.rerolls,
    skipped: record.skippedBosses
      .map((id) => {
        const boss = data.bosses.get(id);
        return { id, name: boss?.name ?? nameFromId(id), location: boss?.location ?? null };
      })
      .sort(byName),
    topClasses: [...classes].map(([id, count]) => ({ id, name: className(id), count })).sort(byCount),
    gear: sorted,
    uniqueGear: GEAR_KINDS.reduce((sum, kind) => (kind === "shortlist" ? sum : sum + sorted[kind].length), 0),
    mostRerolled: [...rerolled.values()].sort(byCount).slice(0, MOST_REROLLED),
  };
}
