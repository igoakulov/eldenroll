/** Balance values the engine reads as an argument rather than an import, so a run can override them
 * and a seed still reproduces its roll. Odds and modifier values are per row, so they stay in the
 * data files. */
export interface Hyperparams {
  readonly repetitionDecay: number;
  readonly defaultMaxStatGap: number;
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  repetitionDecay: 0.8,
  defaultMaxStatGap: 10,
};
