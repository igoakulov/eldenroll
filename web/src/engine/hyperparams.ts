/** Evens out how often items show over a whole run: an item in reach for a tenth of the run rolls at
 * ten times its odds, so by the run's end it is about as likely to have shown as one in reach from
 * the start. `runLeft` is the share of the run still ahead when the item last came into reach
 * (`Run.availableSince`), never below its ceiling (`EngineData.runLeft`); `strength` 1 evens fully,
 * lower only partly, 0 turns it off. */
export interface CatchUpParams {
  readonly strength: number;
}

export function catchUpBoost(runLeft: number, params: CatchUpParams): number {
  return (1 / runLeft) ** params.strength;
}

/** Balance values the engine reads as an argument rather than an import, so a run can override them
 * and a seed still reproduces its roll. Odds and modifier values are per row, so they stay in the
 * data files. */
export interface Hyperparams {
  readonly catchUp: CatchUpParams;
  readonly defaultMaxStatGap: number;
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  catchUp: { strength: 3 },
  defaultMaxStatGap: 10,
};
