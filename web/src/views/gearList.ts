import { copy } from "../copy";
import type { Database, Item } from "../engine/database";
import { iconKey } from "./icons";
import { findMatch } from "./search";

/** In card order: a list of picks reads like the card. */
const GEAR_KINDS = [
  "weapon",
  "shield",
  "ash",
  "sorcery",
  "incantation",
  "talisman",
  "armor_set",
  "tool",
  "consumable",
  "rule",
] as const;
export type GearGroup = (typeof GEAR_KINDS)[number];
export const GEAR_GROUPS = GEAR_KINDS.map((kind) => ({ kind, label: copy.runSettings.gearGroups[kind] }));

export interface GearEntry {
  /** What the list stores: an `optionKey` for `Never roll`, an item id for the `Weapon shortlist`. */
  readonly key: string;
  readonly name: string;
  readonly group: GearGroup;
  /** An icon file key without its size; `null` for a combat rule. */
  readonly icon: string | null;
  /** Other names that find it: an armor set's pieces. */
  readonly pieces: readonly string[];
}

const ORDER = new Map<GearGroup, number>(GEAR_GROUPS.map((group, index) => [group.kind, index]));

function byCardOrder(entries: readonly GearEntry[]): GearEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (ORDER.get(a.entry.group) ?? 0) - (ORDER.get(b.entry.group) ?? 0) || a.index - b.index)
    .map(({ entry }) => entry);
}

function itemEntry(item: Item, key: string): GearEntry | null {
  const group = GEAR_GROUPS.find((one) => one.kind === item.category)?.kind;
  if (group === undefined) return null;
  return { key, name: item.name, group, icon: iconKey(item), pieces: [] };
}

/** Real items, never alias labels, and armor as whole sets; the `None` pieces neither show nor find a set. */
export function neverRollEntries(database: Pick<Database, "item" | "armor_set" | "combat_rule">): GearEntry[] {
  const items = new Map(database.item.map((item) => [item.id, item]));
  const gear = database.item
    .filter((item) => item.odds > 0 && item.category !== "armor")
    .map((item) => itemEntry(item, `item:${item.id}`))
    .filter((entry) => entry !== null);
  const sets = database.armor_set
    .filter((set) => set.odds > 0)
    .map(
      (set): GearEntry => ({
        key: `armor_set:${set.id}`,
        name: set.name,
        group: "armor_set",
        icon: "body",
        pieces: set.pieces
          .filter((id) => !id.startsWith("none_"))
          .map((id) => items.get(id)?.name)
          .filter((name) => name !== undefined),
      }),
    );
  const rules = database.combat_rule
    .filter((rule) => rule.odds > 0)
    .map((rule): GearEntry => ({ key: `rule:${rule.id}`, name: rule.name, group: "rule", icon: null, pieces: [] }));
  return byCardOrder([...gear, ...sets, ...rules]);
}

/** Never narrowed by class, since classes can change at any time. */
export function shortlistEntries(database: Pick<Database, "item">): GearEntry[] {
  return byCardOrder(
    database.item
      .filter((item) => item.odds > 0)
      .filter((item) => item.category === "weapon" || item.subcategory === "greatshield")
      .map((item) => itemEntry(item, item.id))
      .filter((entry) => entry !== null),
  );
}

export interface FoundEntry {
  readonly entry: GearEntry;
  /** The part of the name matching the search, as `[start, end)`; absent when only a piece matched. */
  readonly match?: readonly [number, number];
}

export interface FoundGroup {
  readonly kind: GearGroup;
  readonly label: string;
  readonly rows: readonly FoundEntry[];
}

/** Matches by group in card order; within one, names starting with the search first, then by name. */
export function searchGear(entries: readonly GearEntry[], query: string): FoundGroup[] {
  const found = entries
    .map((entry): FoundEntry | null => {
      const match = findMatch(entry.name, query);
      if (match !== null) return { entry, match };
      return entry.pieces.some((piece) => findMatch(piece, query) !== null) ? { entry } : null;
    })
    .filter((row) => row !== null);
  const start = (row: FoundEntry) => (row.match?.[0] === 0 ? 0 : 1);
  return GEAR_GROUPS.map((group) => ({
    kind: group.kind,
    label: group.label,
    rows: found
      .filter((row) => row.entry.group === group.kind)
      .sort(
        (a, b) =>
          start(a) - start(b) || a.entry.name.localeCompare(b.entry.name, "en", { sensitivity: "base" }),
      ),
  })).filter((group) => group.rows.length > 0);
}

/** The entries in `keys`, in card order. */
export function pickedEntries(entries: readonly GearEntry[], keys: ReadonlySet<string>): GearEntry[] {
  return entries.filter((entry) => keys.has(entry.key));
}
