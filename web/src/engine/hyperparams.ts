/** The catch-up boost on an item or armor set (`data/balance.md#Hyperparameters`), in two steps. */
export interface CatchUp {
  /** `runLeft` is the share of the run's bosses still to fell when the option last came into reach
   * (`Run.availableSince`): 1 from the start, near 0 at the end. */
  readonly boost: (runLeft: number) => number;
  /** Within one pool, over its options with a location: `odds` is their base odds summed, `boostedOdds` the same
   * with each one's `boost` applied. Options with no location keep a boost of 1. */
  readonly inPool: (inputs: { readonly boost: number; readonly odds: number; readonly boostedOdds: number }) => number;
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
    // The cap keeps what comes into reach at the very end of a run below the `guarantee` tier
    boost: (runLeft) => Math.min((1 / runLeft) ** 5, 20_000),
    // Catch-up moves chance among options with a location and takes none from the rest of the pool
    inPool: ({ boost, odds, boostedOdds }) => (boost * odds) / boostedOdds,
  },
  defaultMaxStatGap: 10,
};
