import { isNone, type ArmorSet, type BossInstance, type CharacterClass, type CombatRule, type Database, type Item, type Region } from "../engine/database";
import { splitDlc } from "../engine/regions";

/** The rows with the longest labels in `db.json`, so the kit stresses a layout the way real data does
 * (web/src/ui/README.md#UI kit). Only rollable rows count: nothing else reaches a screen. */
export interface Samples {
  readonly weapon: Item;
  readonly shield: Item;
  readonly ash: Item;
  readonly spell: Item;
  readonly talisman: Item;
  /** A tool or consumable, as the card's `Item` slot holds. */
  readonly item: Item;
  readonly armorSet: ArmorSet;
  readonly armorPiece: Item;
  /** An alias's label, which a slot shows in place of the rolled member's name. */
  readonly alias: string;
  readonly rule: CombatRule;
  readonly boss: BossInstance;
  /** The boss with the longest location, which may not be `boss`. */
  readonly bossByLocation: BossInstance;
  readonly characterClass: CharacterClass;
  /** Regions as Start lists them: the base game's and the DLC's, which drops its prefix for a tag. */
  readonly region: Region;
  readonly dlcRegion: Region;
}


function longest<T>(rows: readonly T[], label: (row: T) => string): T {
  const found = rows.reduce<T | undefined>(
    (best, row) => (best === undefined || label(row).length > label(best).length ? row : best),
    undefined,
  );
  if (found === undefined) throw new Error("db.json has no rows to take a kit sample from");
  return found;
}

export function samples(database: Database): Samples {
  const items = database.item.filter((item) => item.odds > 0);
  const longestIn = (...categories: readonly Item["category"][]) =>
    longest(
      items.filter((item) => categories.includes(item.category)),
      (item) => item.name,
    );
  const rollableSets = database.armor_set.filter((set) => set.odds > 0);
  const bosses = database.boss_instance.filter((boss) => boss.odds > 0);
  const regionLabel = (region: Region) => splitDlc(region.name).name;
  return {
    weapon: longestIn("weapon"),
    shield: longestIn("shield"),
    ash: longestIn("ash"),
    spell: longestIn("sorcery", "incantation"),
    talisman: longestIn("talisman"),
    item: longestIn("tool", "consumable"),
    armorSet: longest(rollableSets, (set) => set.name),
    armorPiece: longest(
      database.item.filter((item) => item.alias === null && rollableSets.some((set) => set.pieces.includes(item.id))),
      (item) => item.name,
    ),
    alias: longest(database.alias, (alias) => alias.label).label,
    rule: longest(
      database.combat_rule.filter((rule) => rule.odds > 0 && !isNone(rule.id)),
      (rule) => rule.name,
    ),
    boss: longest(bosses, (boss) => boss.name),
    bossByLocation: longest(bosses, (boss) => boss.location),
    characterClass: longest(database.character_class, (row) => row.name),
    region: longest(
      database.region.filter((region) => !splitDlc(region.name).dlc),
      regionLabel,
    ),
    dlcRegion: longest(
      database.region.filter((region) => splitDlc(region.name).dlc),
      regionLabel,
    ),
  };
}
