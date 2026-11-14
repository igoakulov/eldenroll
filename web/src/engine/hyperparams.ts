/** The catch-up boost on an item or armor set (`data/balance.md#Hyperparameters`). `runLeft` is the share of the
 * run's bosses still to fell when it last came into reach (`Run.availableSince`): 1 from the start, near 0 at the
 * end. */
export type CatchUp = (runLeft: number) => number;

/** Balance values that apply to every row, tuned here against the simulation. The engine reads them as an argument
 * rather than an import, so a run can override them and a seed still reproduces its roll. Odds and modifier values
 * are per row, so they stay in the data files. */
export interface Hyperparams {
  readonly catchUp: CatchUp;
  readonly defaultMaxStatGap: number;
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  // The cap keeps what comes into reach at the very end of a run below the `guarantee` tier
  catchUp: (runLeft) => Math.min((1 / runLeft) ** 3, 20_000),
  defaultMaxStatGap: 10,
};
