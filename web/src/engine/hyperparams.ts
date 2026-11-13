/** Decay is the rate a repeated option's odds multiply by, once per completed objective that
 * showed it. A bigger pool decays harder, since it holds many other options (including late-game
 * ones just come into reach) that can use the room; a pool of one (`none` alone in its category)
 * barely decays, since there's nothing else for it to crowd out. `size` is read from
 * `EngineData.decayGroupSize` (`web/src/engine/README.md#Decay`). */
export interface DecayParams {
  /** The decay rate for a pool of size 1, close to no decay at all. */
  readonly max: number;
  /** The decay rate an arbitrarily large pool approaches. */
  readonly min: number;
  /** The pool size halfway between `max` and `min`. */
  readonly halfSize: number;
}

export function decayRate(size: number, params: DecayParams): number {
  return params.min + (params.max - params.min) * (params.halfSize / (params.halfSize + size));
}

/** Balance values the engine reads as an argument rather than an import, so a run can override them
 * and a seed still reproduces its roll. Odds and modifier values are per row, so they stay in the
 * data files. */
export interface Hyperparams {
  readonly decay: DecayParams;
  readonly defaultMaxStatGap: number;
}

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  decay: { max: 0.95, min: 0.5, halfSize: 150 },
  defaultMaxStatGap: 10,
};
