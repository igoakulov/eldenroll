import type { TallyGroup } from "./slotRoll";

/** Catch-up (`data/balance.md#Hyperparameters`): evens out how often items show over a run, from what each has had. */
export interface CatchUp {
  /** Slots whose tally each class keeps apart, since their pools differ by class; every other slot's tally is shared
   * by every class. A second slot of a kind shares the first's tally. */
  readonly perCharacterClass: readonly TallyGroup[];
  /** Each option's chance in one roll, rules left out, from the options with a location that can roll now: `odds` its
   * base odds, `had` its tally, the chance it has had so far. `share` is the part of the roll those options hold at
   * base odds; the rest of the pool keeps its base share. `ceiling` is the most the option may get in multiples of its
   * plain share, absent where no run gives the share of it left. */
  readonly even: (options: readonly CatchUpOption[], share: number) => readonly number[];
  /** What catch-up multiplies an option's odds by while a rule above ×1 is active on it, from what catch-up alone would
   * (`caughtUp`): a rule must mean the same whatever the tally says, even for an option ahead of its peers. */
  readonly boosted: (caughtUp: number) => number;
  /** The runway ceiling (`data/balance.md#Hyperparameters`): from the share of the run's bosses still alive when an
   * option first could roll, the most catch-up may give it, in multiples of its plain share. */
  readonly ceiling: (left: number) => number;
}

export interface CatchUpOption {
  readonly odds: number;
  readonly had: number;
  readonly ceiling?: number;
}

/** Fixed shares (`data/balance.md#Fixed shares`): `none`, consumables and anything else found everywhere hold a share
 * of their roll that the size of the rest of the pool can't move. */
export interface FixedShare {
  /** What an option in the rest of the pool weighs, from `share`, its part of the rest at base odds; together they
   * weigh `restWeight(1)` against the fixed shares' own odds. */
  readonly restWeight: (share: number) => number;
}

/** Balance values that apply to every row, tuned here against the simulation, and the engine's only balance: no other
 * engine file may weigh a roll (`data/balance.md#Levers`). The engine reads them as an argument
 * rather than an import, so a run can override them and a seed still reproduces its roll. Odds and modifier values
 * are per row, so they stay in the data files. */
export interface Hyperparams {
  readonly catchUp: CatchUp;
  readonly fixedShare: FixedShare;
  readonly defaultMaxStatGap: number;
}

// Raise the lowest tallies, per unit of odds, to one common level with the roll's chance, each option held to its
// ceiling times its plain share: whoever is furthest behind gets the most, and whoever is above the level sits this roll
// out. The level is found by halving, since the held options no longer rise with it
function fill(options: readonly CatchUpOption[], share: number): readonly number[] {
  const total = options.reduce((sum, option) => sum + option.odds, 0);
  const most = options.map((option) => ((option.ceiling ?? Infinity) * share * option.odds) / total);
  const at = (level: number) => options.map((option, index) => Math.min(Math.max(level * option.odds - option.had, 0), most[index]!));
  let low = -1e9;
  let high = 1e9;
  for (let step = 0; step < 100; step++) {
    const middle = (low + high) / 2;
    if (at(middle).reduce((sum, chance) => sum + chance, 0) < share) low = middle;
    else high = middle;
  }
  return at(high);
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  catchUp: {
    perCharacterClass: ["lh", "talisman_1"],
    even: fill,
    // Never below the option's base share, so a synergy or guarantee holds on an option that has shown a lot
    boosted: (caughtUp) => Math.max(caughtUp, 1),
    // 1.5 over the share of the run left on arrival, so a late arrival may catch up harder than an early one; the last
    // few objectives count as a twentieth of the run, so the ceiling stays finite
    ceiling: (left) => 1.5 / Math.max(left, 0.05),
  },
  // The rest of the pool counts as 100 odds, so a fixed share at odds 100 holds half its roll
  fixedShare: { restWeight: (share) => share * 100 },
  defaultMaxStatGap: 10,
};
