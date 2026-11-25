// A finished run as stored: only what its view shows, each id once (web/README.md#Saving).
import type { LoadoutSlot } from "../engine/database";
import type { RolledSlots } from "../engine/display";
import { LOADOUT_ORDER } from "../engine/loadout";
import type { DeadBoss, Run } from "../engine/run";
import { STATS, type Stats } from "../engine/settings";
import { SCHEMA_VERSION } from "./restore";

/** Safari keeps 5 MB per site; read as two bytes a character, a run through the whole game and the active run beside it
 * leave room for about 50 of them. */
export const PAST_RUNS_CAP = 40;

/** `-1` in a slot: the class has no row for it, so it never rolled. */
const NOT_ROLLED = -1;

export interface FinishedRun {
  readonly schemaVersion: number;
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  /** Every id the run names, once; the numbers below point into it. */
  readonly ids: readonly string[];
  /** Per objective: boss, class, the slots in `LOADOUT_ORDER` (an empty result is `null`), the stats in `STATS`, then
   * its reroll count. */
  readonly objectives: readonly (readonly (number | null)[])[];
  /** Boss and the objective showing when it was marked. */
  readonly felled: readonly (readonly [number, number])[];
  readonly skipped: readonly number[];
}

export interface FinishedObjective {
  readonly boss: string;
  readonly characterClass: string;
  readonly slots: RolledSlots;
  readonly stats: Stats;
  readonly rerolls: number;
}

export interface Finished {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly objectives: readonly FinishedObjective[];
  readonly deadBosses: readonly DeadBoss[];
  readonly skippedBosses: readonly string[];
}

export function packFinished(
  run: Run,
  meta: { readonly runId: string; readonly startedAt: string; readonly finishedAt: string },
): FinishedRun {
  const ids: string[] = [];
  const index = new Map<string, number>();
  const ref = (id: string): number => {
    let at = index.get(id);
    if (at === undefined) {
      at = ids.length;
      index.set(id, at);
      ids.push(id);
    }
    return at;
  };
  const objectives = run.completed.map((objective) => [
    ref(objective.boss),
    ref(objective.characterClass),
    ...LOADOUT_ORDER.map((slot) => {
      const id = objective.slots[slot];
      return id === undefined ? NOT_ROLLED : id === null ? null : ref(id);
    }),
    ...STATS.map((stat) => objective.stats[stat]),
    objective.rerolls.length,
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    ...meta,
    objectives,
    felled: run.deadBosses.map((row) => [ref(row.instanceId), row.objectiveIndex] as const),
    skipped: run.skippedBosses.map(ref),
    ids,
  };
}

/** `null` for anything unreadable; ids gone from the data stay, for the view to name from the id. */
export function unpackFinished(value: unknown): Finished | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<Record<keyof FinishedRun, unknown>>;
  const { ids, objectives, felled, skipped } = raw;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return null;
  if (!Array.isArray(objectives) || !Array.isArray(felled) || !Array.isArray(skipped)) return null;
  if (typeof raw.runId !== "string" || typeof raw.startedAt !== "string" || typeof raw.finishedAt !== "string")
    return null;
  const id = (at: unknown): string | undefined => (typeof at === "number" ? (ids[at] as string | undefined) : undefined);
  const width = 2 + LOADOUT_ORDER.length + STATS.length + 1;
  const read: FinishedObjective[] = [];
  for (const row of objectives as unknown[]) {
    if (!Array.isArray(row) || row.length !== width) return null;
    const boss = id(row[0]);
    const characterClass = id(row[1]);
    if (boss === undefined || characterClass === undefined) return null;
    const slots: Partial<Record<LoadoutSlot, string | null>> = {};
    LOADOUT_ORDER.forEach((slot, at) => {
      const cell: unknown = row[2 + at];
      if (cell === null) slots[slot] = null;
      else if (cell !== NOT_ROLLED) {
        const named = id(cell);
        if (named !== undefined) slots[slot] = named;
      }
    });
    const stats = Object.fromEntries(
      STATS.map((stat, at) => [stat, Number(row[2 + LOADOUT_ORDER.length + at])]),
    ) as Stats;
    read.push({ boss, characterClass, slots, stats, rerolls: Number(row[width - 1]) });
  }
  return {
    runId: raw.runId,
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    objectives: read,
    deadBosses: (felled as unknown[]).flatMap((row) => {
      const instanceId = Array.isArray(row) ? id(row[0]) : undefined;
      return instanceId === undefined ? [] : [{ instanceId, objectiveIndex: Number((row as unknown[])[1]) }];
    }),
    skippedBosses: (skipped as unknown[]).flatMap((at) => id(at) ?? []),
  };
}

/** Newest first; past the cap the oldest goes, silently. A run already kept, as when two tabs finish it, is kept
 * once. */
export function withFinished(past: readonly unknown[], run: FinishedRun): readonly unknown[] {
  const others = past.filter(
    (one) => typeof one !== "object" || one === null || (one as { runId?: unknown }).runId !== run.runId,
  );
  return [run, ...others].slice(0, PAST_RUNS_CAP);
}
