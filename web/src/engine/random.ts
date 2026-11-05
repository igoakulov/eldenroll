import type { Random } from "./slotRoll";

export interface SeededRandom {
  readonly random: Random;
  /** The state to store, so the next roll continues the same sequence. */
  readonly state: () => number;
}

/** Mulberry32: small, fast and the same on every JavaScript engine. */
export function seededRandom(seed: number): SeededRandom {
  let state = seed | 0;
  return {
    random: () => {
      state = (state + 0x6d2b79f5) | 0;
      let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    },
    state: () => state,
  };
}

export interface Weighted<T> {
  readonly value: T;
  readonly weight: number;
}

/** Walks the rows in order, so the same random number always picks the same row. */
export function pickWeighted<T>(rows: readonly Weighted<T>[], random: Random): Weighted<T> | null {
  const live = rows.filter((row) => row.weight > 0);
  const total = live.reduce((sum, row) => sum + row.weight, 0);
  let remaining = random() * total;
  for (const row of live) {
    remaining -= row.weight;
    if (remaining < 0) return row;
  }
  return live.at(-1) ?? null;
}
