import { copy } from "../copy";
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
}

export function defaultSettings(
  database: Pick<Database, "character_class">,
  hyperparams: Hyperparams = DEFAULT_HYPERPARAMS,
): Settings {
  return {
    maxStatGap: hyperparams.defaultMaxStatGap,
    characterClasses: database.character_class.map((row) => row.id),
    weaponShortlistEnabled: false,
  };
}

/** Impossible stats give an impossible level; it isn't clamped. */
export function derivedLevel(stats: Stats): number {
  return STATS.reduce((sum, stat) => sum + stats[stat], 0) - LEVEL_OFFSET;
}

const DIGITS = /^[0-9]+$/;

/** A blank or anything but digits keeps `previous`. */
export function correctedStat(entered: string, previous: number): number {
  if (!DIGITS.test(entered)) return previous;
  return Math.min(MAX_STAT, Math.max(MIN_STAT, Number(entered)));
}

export function correctedMaxStatGap(entered: string, previous: number): number {
  return DIGITS.test(entered) ? Number(entered) : previous;
}

/** Stats are typed by hand and impossible builds are accepted, but a run starts at level 1 or above. */
export function statsProblems(stats: Stats): readonly string[] {
  return derivedLevel(stats) < 1 ? [copy.notices.lowLevel] : [];
}

export function settingsProblems(settings: Settings): readonly string[] {
  return settings.characterClasses.length === 0 ? [copy.notices.noClass] : [];
}
