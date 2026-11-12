import type { BossInstance } from "../engine/database";
import type { BossState, Run } from "../engine/run";
import { findMatch } from "./search";

/** Every boss as `Bosses` opens: its state, those felled with `Done` in objective order, and the current objective's
 * boss. An absent boss is alive. */
export interface BossBoard {
  readonly states: ReadonlyMap<string, BossState>;
  readonly completed: readonly string[];
  readonly current: string | null;
}

export function boardBefore(deadBosses: readonly string[], skippedBosses: readonly string[]): BossBoard {
  return {
    states: new Map<string, BossState>([
      ...skippedBosses.map((id) => [id, "skipped"] as const),
      ...deadBosses.map((id) => [id, "dead"] as const),
    ]),
    completed: [],
    current: null,
  };
}

export function boardOf(run: Run): BossBoard {
  return {
    states: new Map<string, BossState>([
      ...run.skippedBosses.map((id) => [id, "skipped"] as const),
      ...run.deadBosses.map((row) => [row.instanceId, "dead"] as const),
    ]),
    completed: run.completed.map((row) => row.boss),
    current: run.current?.boss ?? null,
  };
}

export function countState(board: BossBoard, state: BossState): number {
  return [...board.states.values()].filter((one) => one === state).length;
}

/** The bosses in `state`, in database order. */
export function inState(
  bosses: readonly BossInstance[],
  states: ReadonlyMap<string, BossState>,
  state: BossState,
): string[] {
  return bosses.filter((boss) => states.get(boss.id) === state).map((boss) => boss.id);
}

export interface BossRow {
  readonly boss: BossInstance;
  /** The objective that felled it with `Done`. */
  readonly objective?: number;
  /** The part of the name matching the search, as `[start, end)`. */
  readonly match?: readonly [number, number];
}

export type SectionKind = "alive" | "skipped" | "dead" | "objectives";

export interface BossSection {
  readonly kind: SectionKind;
  readonly rows: readonly BossRow[];
}

/** `placed` is the state each row is listed under, so a changed row stays where it was. Without a search, alive bosses
 * are left out; with one, only matching rows show, alive first. Empty sections are dropped. */
export function bossSections(
  bosses: readonly BossInstance[],
  board: BossBoard,
  placed: ReadonlyMap<string, BossState>,
  query: string,
): BossSection[] {
  const searching = query.trim() !== "";
  const matched = (row: BossRow): BossRow | null => {
    if (!searching) return row;
    const match = findMatch(row.boss.name, query);
    return match === null ? null : { ...row, match };
  };
  const byId = new Map(bosses.map((boss) => [boss.id, boss]));
  const done = new Set(board.completed);
  const inPlace = (state: BossState) =>
    bosses
      .filter((boss) => !done.has(boss.id) && (placed.get(boss.id) ?? "alive") === state)
      .map((boss) => matched({ boss }))
      .filter((row) => row !== null);
  const objectives = board.completed
    .map((id, index) => {
      const boss = byId.get(id);
      return boss === undefined ? null : matched({ boss, objective: index + 1 });
    })
    .filter((row) => row !== null);

  const sections: BossSection[] = [
    ...(searching ? [{ kind: "alive" as const, rows: inPlace("alive") }] : []),
    { kind: "skipped", rows: inPlace("skipped") },
    { kind: "dead", rows: inPlace("dead") },
    { kind: "objectives", rows: objectives },
  ];
  return sections.filter((section) => section.rows.length > 0);
}
