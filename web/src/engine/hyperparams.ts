import type { TallyGroup } from "./slotRoll";

/** Catch-up (`data/balance.md#Hyperparameters`): evens out how often items show over a run, from what each has had. */
export interface CatchUp {
  /** Slots whose tally each class keeps apart, since their pools differ by class; every other slot's tally is shared
   * by every class. A second slot of a kind shares the first's tally. */
  readonly perCharacterClass: readonly TallyGroup[];
  /** Each option's chance in one roll, rules left out, from the options with a location that can roll now: `odds` its
   * base odds, `had` its tally, the chance it has had so far. `share` is the part of the roll those options hold at
   * base odds; the rest of the pool keeps its base share. */
  readonly even: (options: readonly { readonly odds: number; readonly had: number }[], share: number) => readonly number[];
  /** What catch-up multiplies an option's odds by while a rule above ×1 is active on it, from what catch-up alone would
   * (`caughtUp`): a rule must mean the same whatever the tally says, even for an option ahead of its peers. */
  readonly boosted: (caughtUp: number) => number;
}

/** Balance values that apply to every row, tuned here against the simulation, and the engine's only balance: no other
 * engine file may weigh a roll (`data/balance.md#Levers`). The engine reads them as an argument
 * rather than an import, so a run can override them and a seed still reproduces its roll. Odds and modifier values
 * are per row, so they stay in the data files. */
export interface Hyperparams {
  readonly catchUp: CatchUp;
  readonly defaultMaxStatGap: number;
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  catchUp: {
    perCharacterClass: ["lh", "talisman_1"],
    // Raise the lowest tallies, per unit of odds, to one common level with the roll's chance: whoever is furthest
    // behind gets the most, and whoever is above the level sits this roll out
    even: (options, share) => {
      const behind = (index: number) => options[index]!.had / options[index]!.odds;
      const order = options.map((_, index) => index).sort((a, b) => behind(a) - behind(b));
      let odds = 0;
      let had = 0;
      let level = 0;
      for (const [rank, index] of order.entries()) {
        odds += options[index]!.odds;
        had += options[index]!.had;
        level = (share + had) / odds;
        const next = order[rank + 1];
        if (next === undefined || level <= behind(next)) break;
      }
      return options.map((option) => Math.max(0, level * option.odds - option.had));
    },
    // Never below the option's base share, so a synergy or guarantee holds on an option that has shown a lot
    boosted: (caughtUp) => Math.max(caughtUp, 1),
  },
  defaultMaxStatGap: 10,
};
