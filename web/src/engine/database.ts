export const CATEGORIES = [
  "weapon",
  "shield",
  "armor",
  "talisman",
  "ash",
  "sorcery",
  "incantation",
  "tool",
  "consumable",
  "none",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SELECTOR_KINDS = [
  "item",
  "subcategory",
  "category",
  "rule",
  "armor_set",
  "slot",
  "boss",
] as const;
export type SelectorKind = (typeof SELECTOR_KINDS)[number];

export const POOL_SLOTS = [
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
] as const;
export type PoolSlot = (typeof POOL_SLOTS)[number];

/** Armor has no `slot_pool` row: every class rolls one set, from every armor set, after the rules. */
export type LoadoutSlot = PoolSlot | "armor";

/** `ids: null` means every option of the kind. */
export interface Selector {
  readonly kind: SelectorKind;
  readonly ids: readonly string[] | null;
}

export interface Region {
  readonly id: string;
  readonly name: string;
  readonly region_level: number;
  readonly run_left: number;
}

export interface Location {
  readonly id: string;
  readonly name: string;
  readonly region_id: string;
}

export interface BossInstance {
  readonly id: string;
  readonly name: string;
  readonly location_id: string;
  readonly location: string;
  readonly odds: number;
  readonly url: string | null;
}

export interface Item {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly subcategory: string | null;
  readonly infusable: boolean | null;
  readonly str_bonus_2h: boolean | null;
  readonly alias: string | null;
  readonly image: string | null;
  readonly str: number;
  readonly dex: number;
  readonly int: number;
  readonly fth: number;
  readonly arc: number;
  readonly odds: number;
  readonly url: string | null;
}

export interface ArmorSet {
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly string[];
  readonly odds: number;
  readonly url: string | null;
}

export interface AshCompatibility {
  readonly ash_id: string;
  readonly category: Category;
  readonly subcategory: string | null;
}

export interface CombatRule {
  readonly id: string;
  readonly name: string;
  readonly odds: number;
}

export interface CharacterClass {
  readonly id: string;
  readonly name: string;
  readonly odds: number;
}

export interface SlotPool {
  readonly character_class_id: string;
  readonly slot: PoolSlot;
  readonly selectors: readonly Selector[];
}

export interface Alias {
  readonly id: string;
  readonly label: string;
  /** A group page on the wiki, or `null` for `None`. */
  readonly url: string | null;
}

export interface ItemLocation {
  readonly item_id: string;
  readonly location_id: string | null;
  readonly boss_instance_id: string | null;
}

export interface CharacterClassCondition {
  readonly kind: "character_class";
  readonly ids: readonly string[];
}

/** Holds when any of `slots` matches; a negated condition names one slot. */
export interface RolledCondition {
  readonly kind: "rolled";
  readonly slots: readonly (PoolSlot | "boss")[];
  readonly selector: Selector;
  readonly negated: boolean;
}

export type Condition = CharacterClassCondition | RolledCondition;

export interface Modifier {
  readonly id: string;
  readonly when: readonly Condition[];
  readonly target: Selector;
  readonly value: number;
}

/** Tables keep the build's row order, which the engine must iterate in to reproduce a seed. */
export interface Database {
  readonly region: readonly Region[];
  readonly location: readonly Location[];
  readonly boss_instance: readonly BossInstance[];
  readonly item: readonly Item[];
  readonly armor_set: readonly ArmorSet[];
  readonly ash_compatibility: readonly AshCompatibility[];
  readonly combat_rule: readonly CombatRule[];
  readonly character_class: readonly CharacterClass[];
  readonly slot_pool: readonly SlotPool[];
  readonly alias: readonly Alias[];
  readonly item_location: readonly ItemLocation[];
  readonly modifier: readonly Modifier[];
}
