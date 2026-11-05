import type { ArmorSet, CombatRule, Item, Selector } from "./database";

export type Option =
  | { readonly kind: "item"; readonly row: Item }
  | { readonly kind: "rule"; readonly row: CombatRule }
  | { readonly kind: "armor_set"; readonly row: ArmorSet };

/** `none` needs its category or id named, so "every item" can't remove it by accident. */
export function matchesItem(selector: Selector, item: Item): boolean {
  const { ids } = selector;
  switch (selector.kind) {
    case "item":
      return ids === null ? item.category !== "none" : ids.includes(item.id);
    case "category":
      return ids === null ? item.category !== "none" : ids.includes(item.category);
    case "subcategory":
      return item.subcategory !== null && (ids === null || ids.includes(item.subcategory));
    default:
      return false;
  }
}

/** The id `none` exists as an item and as a rule, so a selector only ever matches its own kind. */
export function matchesOption(selector: Selector, option: Option): boolean {
  if (option.kind === "item") return matchesItem(selector, option.row);
  return (
    selector.kind === option.kind && (selector.ids === null || selector.ids.includes(option.row.id))
  );
}
