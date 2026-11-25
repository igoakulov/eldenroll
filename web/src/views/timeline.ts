// The run view's `Timeline` tab: its entries, and what its search can pick (web/README.md#Run view).
import { copy } from "../copy";
import { isNone, type Item } from "../engine/database";
import { displaySlots, type SlotDisplay } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import type { FinishedObjective, RunRecord } from "../save/finished";
import { iconKey } from "./icons";
import { findMatch } from "./search";
import { nameFromId, type Entry, type GearKind } from "./summary";

export type TimelineItem =
  | { readonly kind: "felled"; readonly bosses: readonly string[] }
  | { readonly kind: "objective"; readonly number: number; readonly objective: FinishedObjective };

/** Oldest first. Bosses felled on the way make one entry just before the objective they were marked under; those
 * marked before objective 1 join the first, and those marked during an unfinished objective come last. */
export function timelineItems(record: RunRecord): readonly TimelineItem[] {
  const done = new Set(record.objectives.map((objective) => objective.boss));
  const last = record.objectives.length;
  const felled = new Map<number, string[]>();
  for (const row of record.deadBosses) {
    if (done.has(row.instanceId)) continue;
    const at = Math.min(Math.max(row.objectiveIndex, 1), last + 1);
    felled.set(at, [...(felled.get(at) ?? []), row.instanceId]);
  }
  const items: TimelineItem[] = [];
  const felledAt = (at: number) => {
    const bosses = felled.get(at);
    if (bosses !== undefined) items.push({ kind: "felled", bosses });
  };
  record.objectives.forEach((objective, index) => {
    felledAt(index + 1);
    items.push({ kind: "objective", number: index + 1, objective });
  });
  felledAt(last + 1);
  return items;
}

export const PICK_GROUPS = [
  "boss",
  "character_class",
  "weapon",
  "shield",
  "ash",
  "sorcery",
  "incantation",
  "talisman",
  "armor_set",
  "item",
  "rule",
] as const;
export type PickGroup = (typeof PICK_GROUPS)[number];

/** Something the search can pick: a boss, a class, an item as the card names it, a set or a rule. */
export interface Pick {
  readonly key: string;
  readonly name: string;
  readonly group: PickGroup;
  /** An icon file key, or `null` for one with none. */
  readonly icon: string | null;
}

/** Where a pick shows in an objective: the slot's label, for the line that matched, or none for its boss and class. */
interface Found extends Pick {
  readonly label?: string;
}

export function bossName(data: EngineData, id: string): string {
  return data.bosses.get(id)?.name ?? nameFromId(id);
}

export function className(data: EngineData, id: string): string {
  return data.database.character_class.find((row) => row.id === id)?.name ?? nameFromId(id);
}

const HAND_GROUPS: Readonly<Partial<Record<Item["category"], PickGroup>>> = { weapon: "weapon", shield: "shield" };
const SPELL_GROUPS: Readonly<Partial<Record<Item["category"], PickGroup>>> = {
  sorcery: "sorcery",
  incantation: "incantation",
};

/** The key the search picks a slot's content by; `null` for `none` and `any`. */
export function pickKeyOf(display: SlotDisplay): string | null {
  switch (display.kind) {
    case "item":
      return isNone(display.item.id) ? null : `item:${display.item.id}`;
    case "alias":
      return isNone(display.item.id) || display.item.alias === null ? null : `alias:${display.item.alias}`;
    case "armor_set":
      return `armor_set:${display.set.id}`;
    case "rule":
      return isNone(display.rule.id) ? null : `rule:${display.rule.id}`;
    default:
      return null;
  }
}

/** An item as the card names it: an alias's members share their label. `none` and `any` pick nothing. */
function itemPick(display: SlotDisplay, group: PickGroup | undefined): Pick | null {
  if (group === undefined) return null;
  if (display.kind === "item")
    return { key: `item:${display.item.id}`, name: display.item.name, group, icon: iconKey(display.item) };
  if (display.kind === "alias" && display.item.alias !== null && !isNone(display.item.id))
    return { key: `alias:${display.item.alias}`, name: display.label, group, icon: iconKey(display.item) };
  return null;
}

function category(display: SlotDisplay): Item["category"] | undefined {
  return display.kind === "item" || display.kind === "alias" ? display.item.category : undefined;
}

/** Everything an objective names, in card order: the right hand first, as in any list (web/src/ui/README.md#Direction). */
function objectivePicks(data: EngineData, objective: FinishedObjective): readonly Found[] {
  const shown = displaySlots(data, objective.slots);
  const card = copy.card;
  const found: Found[] = [
    { key: `boss:${objective.boss}`, name: bossName(data, objective.boss), group: "boss", icon: null },
    {
      key: `class:${objective.characterClass}`,
      name: className(data, objective.characterClass),
      group: "character_class",
      icon: null,
    },
  ];
  const add = (pick: Pick | null, label: string) => {
    if (pick !== null) found.push({ ...pick, label });
  };
  for (const [hand, ash, label] of [
    ["rh", "rh_ash", card.rightHand],
    ["lh", "lh_ash", card.leftHand],
  ] as const) {
    const held = category(shown[hand]);
    add(itemPick(shown[hand], held === undefined ? undefined : HAND_GROUPS[held]), label);
    add(itemPick(shown[ash], "ash"), label);
  }
  const spell = category(shown.spell);
  add(itemPick(shown.spell, spell === undefined ? undefined : SPELL_GROUPS[spell]), card.spell);
  add(itemPick(shown.talisman_1, "talisman"), card.talismans);
  add(itemPick(shown.talisman_2, "talisman"), card.talismans);
  const armor = shown.armor;
  if (armor.kind === "armor_set")
    found.push({ key: `armor_set:${armor.set.id}`, name: armor.set.name, group: "armor_set", icon: "body", label: card.armor });
  add(itemPick(shown.item, "item"), card.item);
  const rule = shown.rule;
  if (rule.kind === "rule" && !isNone(rule.rule.id))
    found.push({ key: `rule:${rule.rule.id}`, name: rule.rule.name, group: "rule", icon: null, label: card.combatRule });
  return found;
}

/** The line an objective shows for `pick`: its slot and name, or `null` where only its boss or class matched. */
export function hitIn(
  data: EngineData,
  objective: FinishedObjective,
  pick: string,
): { readonly label: string; readonly name: string } | null | undefined {
  const found = objectivePicks(data, objective).find((one) => one.key === pick);
  if (found === undefined) return undefined;
  return found.label === undefined ? null : { label: found.label, name: found.name };
}

/** Whether an entry holds `pick`. */
export function holds(data: EngineData, item: TimelineItem, pick: string): boolean {
  if (item.kind === "felled") return item.bosses.some((boss) => `boss:${boss}` === pick);
  return hitIn(data, item.objective, pick) !== undefined;
}

export interface PickSection {
  readonly group: PickGroup;
  readonly picks: readonly (Pick & { readonly match: readonly [number, number] })[];
}

/** What the search finds in this run, grouped in card order; in each group, names starting with the search come
 * first, then A–Z. A skipped boss is never in it, since it is never in the timeline. */
export function searchRun(data: EngineData, items: readonly TimelineItem[], query: string): readonly PickSection[] {
  const all = new Map<string, Pick>();
  for (const item of items) {
    const picks =
      item.kind === "felled"
        ? item.bosses.map((boss): Pick => ({ key: `boss:${boss}`, name: bossName(data, boss), group: "boss", icon: null }))
        : objectivePicks(data, item.objective);
    for (const pick of picks) if (!all.has(pick.key)) all.set(pick.key, { key: pick.key, name: pick.name, group: pick.group, icon: pick.icon });
  }
  const matched = [...all.values()].flatMap((pick) => {
    const match = findMatch(pick.name, query);
    return match === null ? [] : [{ ...pick, match }];
  });
  return PICK_GROUPS.flatMap((group) => {
    const picks = matched
      .filter((pick) => pick.group === group)
      .sort((a, b) => Number(b.match[0] === 0) - Number(a.match[0] === 0) || a.name.localeCompare(b.name, "en"));
    return picks.length === 0 ? [] : [{ group, picks }];
  });
}

/** A unique-gear entry as the search picks it, so tapping it finds it in the timeline. */
export function gearPick(data: EngineData, kind: GearKind, entry: Entry): Pick {
  if (kind === "armor_sets") return { key: `armor_set:${entry.id}`, name: entry.name, group: "armor_set", icon: "body" };
  const members = data.aliasMembers.get(entry.id);
  const item = data.items.get(members?.[0] ?? entry.id);
  const group: PickGroup =
    kind === "shields" ? "shield" : kind === "sorceries" ? "sorcery" : kind === "incantations" ? "incantation" : "weapon";
  return {
    key: members === undefined ? `item:${entry.id}` : `alias:${entry.id}`,
    name: entry.name,
    group,
    icon: item === undefined ? null : iconKey(item),
  };
}
