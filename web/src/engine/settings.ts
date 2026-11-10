import type { Database } from "./database";
import { DEFAULT_HYPERPARAMS, type Hyperparams } from "./hyperparams";

export const STATS = ["vig", "mind", "end", "str", "dex", "int", "fth", "arc"] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Readonly<Record<Stat, number>>;

export const MIN_STAT = 1;
export const MAX_STAT = 99;

const LEVEL_OFFSET = 79;

export const DEFAULT_STATS: Stats = {
  vig: 10,
  mind: 10,
  end: 10,
  str: 10,
  dex: 10,
  int: 10,
  fth: 10,
  arc: 10,
};

/** The weapon shortlist and dead bosses are run state, so they sit beside these (`web/README.md#Saving`). */
export interface Settings {
  readonly maxStatGap: number;
  readonly characterClasses: readonly string[];
  readonly weaponShortlistEnabled: boolean;
  readonly bossGearLockedUntilDead: boolean;
}

export function defaultSettings(
  database: Pick<Database, "character_class">,
  hyperparams: Hyperparams = DEFAULT_HYPERPARAMS,
): Settings {
  return {
    maxStatGap: hyperparams.defaultMaxStatGap,
    characterClasses: database.character_class.map((row) => row.id),
    weaponShortlistEnabled: false,
    bossGearLockedUntilDead: true,
  };
}

/** Impossible stats give an impossible level, such as -15 with every stat at 8; it isn't clamped. */
export function derivedLevel(stats: Stats): number {
  return STATS.reduce((sum, stat) => sum + stats[stat], 0) - LEVEL_OFFSET;
}

const DIGITS = /^[0-9]+$/;

/** Only the digits 0 to 9 are valid, so a blank or anything else keeps `previous`. */
export function correctedStat(entered: string, previous: number): number {
  if (!DIGITS.test(entered)) return previous;
  return Math.min(MAX_STAT, Math.max(MIN_STAT, Number(entered)));
}

export function correctedMaxStatGap(entered: string, previous: number): number {
  return DIGITS.test(entered) ? Number(entered) : previous;
}

export function settingsProblems(settings: Settings): readonly string[] {
  return settings.characterClasses.length === 0 ? ["Select at least one class"] : [];
}
