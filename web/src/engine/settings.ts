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

/** The upgraded weapons list and dead bosses are run state, so they sit beside these (`prd.md` §11). */
export interface Settings {
  readonly maxStatGap: number;
  readonly builds: readonly string[];
  readonly upgradedWeaponsEnabled: boolean;
  readonly bossItemsOnlyFromDeadBosses: boolean;
}

export function defaultSettings(
  database: Pick<Database, "build">,
  hyperparams: Hyperparams = DEFAULT_HYPERPARAMS,
): Settings {
  return {
    maxStatGap: hyperparams.defaultMaxStatGap,
    builds: database.build.map((row) => row.id),
    upgradedWeaponsEnabled: false,
    bossItemsOnlyFromDeadBosses: true,
  };
}

export function derivedLevel(stats: Stats): number {
  const total = STATS.reduce((sum, stat) => sum + stats[stat], 0);
  return Math.max(1, total - LEVEL_OFFSET);
}

/** A blank or non-numeric entry keeps `previous`; anything else lands on the nearest valid value. */
export function correctedStat(entered: number, previous: number): number {
  if (!Number.isFinite(entered)) return previous;
  return Math.min(MAX_STAT, Math.max(MIN_STAT, Math.floor(entered)));
}

export function correctedMaxStatGap(entered: number, previous: number): number {
  if (!Number.isFinite(entered)) return previous;
  return Math.max(0, Math.floor(entered));
}

export function settingsProblems(settings: Settings): readonly string[] {
  return settings.builds.length === 0 ? ["Select at least one build"] : [];
}
