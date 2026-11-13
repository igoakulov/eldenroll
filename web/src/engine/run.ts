import { copy } from "../copy";
import type { LoadoutSlot } from "./database";
import type { RolledSlots } from "./display";
import { countedItems } from "./eligibility";
import type { EngineData } from "./engineData";
import type { Hyperparams } from "./hyperparams";
import { LOADOUT_ORDER, rollLoadout } from "./loadout";
import { pickWeighted, seededRandom } from "./random";
import { bossPool, selectedLocations, type BossPool } from "./regions";
import {
  derivedLevel,
  settingsProblems,
  statsProblems,
  type Settings,
  type Stats,
} from "./settings";
import { repeatKey, type Random, type RollObserver } from "./slotRoll";
import {
  pickTrace,
  slotTrace,
  type TraceBlock,
  type TraceSlot,
} from "./trace";

export interface Engine {
  readonly data: EngineData;
  readonly hyperparams: Hyperparams;
  readonly observe?: RollObserver;
}

export interface DeadBoss {
  readonly instanceId: string;
  /** The objective showing when the boss was marked; 0 before objective 1. */
  readonly objectiveIndex: number;
}

export type RerollTarget = "boss" | "character_class" | LoadoutSlot;

export interface Objective {
  readonly boss: string;
  readonly characterClass: string;
  readonly slots: RolledSlots;
  readonly shortlistRh: boolean;
  /** Every reroll since the last `Done`, carried across `Reroll objective` and `Reroll items`. */
  readonly rerolls: readonly RerollTarget[];
  /** One block per rolled slot, for the console in development (`web/src/engine/README.md#Trace`). */
  readonly trace: readonly TraceBlock[];
}

export interface CompletedObjective extends Objective {
  readonly stats: Stats;
  readonly level: number;
}

export type Waiting = "no_region" | "no_bosses" | "regions_cleared";

export const WAITING_MESSAGES: Readonly<Record<Waiting, string>> = {
  no_region: copy.notices.noRegion,
  no_bosses: copy.notices.noBosses,
  regions_cleared: copy.notices.regionsCleared,
};

/** Plain data throughout, so a run can be saved and restored as JSON. */
export interface Run {
  readonly seed: number;
  readonly rngState: number;
  readonly finished: boolean;
  readonly stats: Stats;
  readonly settings: Settings;
  readonly regions: readonly string[];
  readonly weaponShortlist: readonly string[];
  readonly deadBosses: readonly DeadBoss[];
  /** Kept out of the boss pool by the player, but alive for their items and the summary. */
  readonly skippedBosses: readonly string[];
  /** `optionKey`s of gear and combat rules the player never wants rolled. */
  readonly neverRoll: readonly string[];
  readonly current: Objective | null;
  readonly waiting: Waiting | null;
  readonly completed: readonly CompletedObjective[];
  /** How many completed objectives showed each `repeatKey` or `character_class:` id. */
  readonly seen: Readonly<Record<string, number>>;
}

export interface RunInputs {
  readonly stats: Stats;
  readonly settings: Settings;
  readonly regions: readonly string[];
  readonly weaponShortlist: readonly string[];
  readonly deadBosses: readonly string[];
  readonly skippedBosses?: readonly string[];
  readonly neverRoll?: readonly string[];
}

export type StartResult =
  | { readonly ok: true; readonly run: Run }
  | { readonly ok: false; readonly problems: readonly string[] };

function characterClassKey(characterClass: string): string {
  return `character_class:${characterClass}`;
}

const TRACE_ORDER: readonly TraceSlot[] = ["boss", "character_class", ...LOADOUT_ORDER];

function traceBefore(trace: readonly TraceBlock[], slot: TraceSlot): readonly TraceBlock[] {
  const limit = TRACE_ORDER.indexOf(slot);
  return trace.filter((block) => TRACE_ORDER.indexOf(block.slot) < limit);
}

function deadSet(run: Run): ReadonlySet<string> {
  return new Set(run.deadBosses.map((row) => row.instanceId));
}

/** `asIfDead` only changes which boss rows count; the map still follows who is really dead. */
function counted(engine: Engine, run: Run, asIfDead?: ReadonlySet<string>): ReadonlySet<string> {
  return countedItems(engine.data, {
    locations: selectedLocations(engine.data.database, new Set(run.regions), deadSet(run)),
    deadBosses: asIfDead ?? deadSet(run),
    bossGearLockedUntilDead: run.settings.bossGearLockedUntilDead,
  });
}

function repetition(engine: Engine, run: Run) {
  return { seen: run.seen, decayGroupSize: engine.data.decayGroupSize, decay: engine.hyperparams.decay };
}

type Rolled = { readonly id: string; readonly block: TraceBlock };

function rollBoss(
  engine: Engine,
  run: Run,
  random: Random,
  exclude: string | null,
): Rolled | Exclude<BossPool["status"], "ready"> {
  const pool = bossPool(
    engine.data.database,
    new Set(run.regions),
    deadSet(run),
    new Set(run.skippedBosses),
  );
  if (pool.status !== "ready") return pool.status;
  const rows = pool.bosses.map((row) => ({ value: row, weight: row.odds }));
  const others = rows.filter((row) => row.value.id !== exclude);
  const candidates = others.length > 0 ? others : rows;
  const picked = pickWeighted(candidates, random);
  if (picked === null) return "no_bosses";
  const total = candidates.reduce((sum, row) => sum + row.weight, 0);
  const boss = picked.value;
  return {
    id: boss.id,
    block: pickTrace("boss", {
      heading: `${boss.name} — ${boss.location}`,
      pool: candidates.length,
      odds: boss.odds,
      repeat: null,
      probability: picked.weight / total,
    }),
  };
}

/** Odds are a deliberate, fixed mix of playstyles (`data/balance.md#Classes with extra rules`),
 * not a pool to keep varied, so classes don't decay. */
function rollCharacterClass(engine: Engine, run: Run, random: Random, exclude: string | null): Rolled | null {
  const rows = engine.data.database.character_class
    .filter((row) => run.settings.characterClasses.includes(row.id))
    .map((row) => ({ value: row, weight: row.odds }));
  const others = rows.filter((row) => row.value.id !== exclude);
  const candidates = others.length > 0 ? others : rows;
  const picked = pickWeighted(candidates, random);
  if (picked === null) return null;
  const total = candidates.reduce((sum, row) => sum + row.weight, 0);
  const characterClass = picked.value;
  return {
    id: characterClass.id,
    block: pickTrace("character_class", {
      heading: characterClass.name,
      pool: candidates.length,
      odds: characterClass.odds,
      repeat: null,
      probability: picked.weight / total,
    }),
  };
}

interface RolledSlotsResult {
  readonly slots: RolledSlots;
  readonly shortlistRh: boolean | null;
  readonly trace: readonly TraceBlock[];
}

function rollSlots(
  engine: Engine,
  run: Run,
  random: Random,
  objective: { boss: string; characterClass: string },
  from: LoadoutSlot = "rh",
  kept: RolledSlots = {},
  exclude: string | null = null,
): RolledSlotsResult {
  const decay = repetition(engine, run);
  const allDead = new Set(engine.data.database.boss_instance.map((row) => row.id));
  const loadout = rollLoadout({
    data: engine.data,
    characterClass: objective.characterClass,
    boss: objective.boss,
    counted: counted(engine, run),
    countedIfBossesDead: counted(engine, run, allDead),
    limits: { stats: run.stats, maxStatGap: run.settings.maxStatGap },
    random,
    repetition: decay,
    lateOffset: engine.hyperparams.lateOffset,
    shortlist: run.settings.weaponShortlistEnabled ? new Set(run.weaponShortlist) : null,
    neverRoll: new Set(run.neverRoll),
    from,
    kept,
    exclude,
    ...(engine.observe === undefined ? {} : { observe: engine.observe }),
  });
  const start = LOADOUT_ORDER.indexOf(from);
  const slots: Partial<Record<LoadoutSlot, string | null>> = {};
  for (const slot of LOADOUT_ORDER.slice(0, start)) {
    if (kept[slot] !== undefined) slots[slot] = kept[slot];
  }
  for (const [slot, roll] of loadout) slots[slot] = roll.chosen?.option.row.id ?? null;
  const rolled = { boss: objective.boss, characterClass: objective.characterClass, slots };
  const trace = [...loadout].map(([slot, roll]) => slotTrace(engine.data, slot, roll, rolled, decay));
  const rh = loadout.get("rh");
  return { slots, shortlistRh: rh === undefined ? null : rh.fromShortlist, trace };
}

function stopped(run: Run, status: Exclude<BossPool["status"], "ready">, rngState: number): Run {
  if (status === "all_dead") return { ...run, rngState, current: null, waiting: null, finished: true };
  return { ...run, rngState, current: null, waiting: status };
}

/** Rolls a whole new objective, or leaves the run waiting or finished when no boss can roll. */
function rollObjective(
  engine: Engine,
  run: Run,
  rerolls: readonly RerollTarget[],
  excludeBoss: string | null,
): Run {
  const { random, state } = seededRandom(run.rngState);
  const boss = rollBoss(engine, run, random, excludeBoss);
  if (typeof boss === "string") return stopped(run, boss, state());
  const characterClass = rollCharacterClass(engine, run, random, null);
  if (characterClass === null) return { ...run, rngState: state(), current: null, waiting: null };
  const loadout = rollSlots(engine, run, random, { boss: boss.id, characterClass: characterClass.id });
  return {
    ...run,
    rngState: state(),
    waiting: null,
    current: {
      boss: boss.id,
      characterClass: characterClass.id,
      slots: loadout.slots,
      shortlistRh: loadout.shortlistRh ?? false,
      rerolls,
      trace: [boss.block, characterClass.block, ...loadout.trace],
    },
  };
}

export function startRun(engine: Engine, inputs: RunInputs, seed: number): StartResult {
  const problems = [...statsProblems(inputs.stats), ...settingsProblems(inputs.settings)];
  const pool = bossPool(
    engine.data.database,
    new Set(inputs.regions),
    new Set(inputs.deadBosses),
    new Set(inputs.skippedBosses ?? []),
  );
  if (pool.status === "all_dead") problems.push(copy.notices.allDead);
  else if (pool.status !== "ready") problems.push(WAITING_MESSAGES[pool.status]);
  if (problems.length > 0) return { ok: false, problems };

  const run: Run = {
    seed,
    rngState: seed,
    finished: false,
    stats: inputs.stats,
    settings: inputs.settings,
    regions: inputs.regions,
    weaponShortlist: inputs.weaponShortlist,
    deadBosses: inputs.deadBosses.map((instanceId) => ({ instanceId, objectiveIndex: 0 })),
    skippedBosses: inputs.skippedBosses ?? [],
    neverRoll: inputs.neverRoll ?? [],
    current: null,
    waiting: null,
    completed: [],
    seen: {},
  };
  return { ok: true, run: rollObjective(engine, run, [], null) };
}

export function objectiveNumber(run: Run): number {
  return run.completed.length + 1;
}

/** Changes apply on the next roll; the current objective stays as it is. */
export function editRun(
  run: Run,
  changes: Partial<Pick<Run, "stats" | "settings" | "regions" | "weaponShortlist" | "neverRoll">>,
): Run {
  return { ...run, ...changes };
}

export type BossState = "alive" | "dead" | "skipped";

export interface BossStatus {
  readonly state: BossState;
  /** Dead from `Done`, or the current objective's boss, which only `Already dead` may mark. */
  readonly locked: boolean;
}

export function bossStatus(run: Run, boss: string): BossStatus {
  const doneDead = run.completed.some((row) => row.boss === boss);
  const state: BossState = run.deadBosses.some((row) => row.instanceId === boss)
    ? "dead"
    : run.skippedBosses.includes(boss)
      ? "skipped"
      : "alive";
  return { state, locked: doneDead || run.current?.boss === boss };
}

/** The `Bosses` list; like any edit, it applies on the next roll and decays nothing. */
export function setBossState(engine: Engine, run: Run, boss: string, state: BossState): Run {
  const row = engine.data.bosses.get(boss);
  if (row === undefined || row.odds <= 0 || bossStatus(run, boss).locked) return run;
  const deadBosses = run.deadBosses.filter((one) => one.instanceId !== boss);
  const skippedBosses = run.skippedBosses.filter((one) => one !== boss);
  const marked = { instanceId: boss, objectiveIndex: run.current === null ? run.completed.length : objectiveNumber(run) };
  return {
    ...run,
    deadBosses: state === "dead" ? [...deadBosses, marked] : deadBosses,
    skippedBosses: state === "skipped" ? [...skippedBosses, boss] : skippedBosses,
  };
}

function seenIn(engine: Engine, objective: Objective): string[] {
  const keys = [characterClassKey(objective.characterClass)];
  for (const [slot, id] of Object.entries(objective.slots) as [LoadoutSlot, string | null][]) {
    if (id === null) continue;
    if (slot === "armor") {
      const row = engine.data.armorSets.get(id);
      if (row !== undefined) keys.push(repeatKey({ kind: "armor_set", row }));
      continue;
    }
    if (slot === "rule_1" || slot === "rule_2") {
      const row = engine.data.rules.get(id);
      if (row !== undefined) keys.push(repeatKey({ kind: "rule", row }));
      continue;
    }
    const row = engine.data.items.get(id);
    if (row !== undefined) keys.push(repeatKey({ kind: "item", row }));
  }
  return keys;
}

/** `none` can fill several slots of one objective, but the objective counts once. */
function countedOnce(
  seen: Readonly<Record<string, number>>,
  keys: readonly string[],
): Readonly<Record<string, number>> {
  const next = { ...seen };
  for (const key of new Set(keys)) next[key] = (next[key] ?? 0) + 1;
  return next;
}

export function done(engine: Engine, run: Run): Run {
  const objective = run.current;
  if (objective === null || run.finished) return run;
  const completed: CompletedObjective = {
    ...objective,
    stats: run.stats,
    level: derivedLevel(run.stats),
  };
  const next: Run = {
    ...run,
    completed: [...run.completed, completed],
    deadBosses: [
      ...run.deadBosses,
      { instanceId: objective.boss, objectiveIndex: objectiveNumber(run) },
    ],
    seen: countedOnce(run.seen, seenIn(engine, objective)),
    current: null,
  };
  // The next objective waits for `rollNext`, after `Level up`; only whether one can roll is known now
  const pool = bossPool(
    engine.data.database,
    new Set(next.regions),
    deadSet(next),
    new Set(next.skippedBosses),
  );
  if (pool.status === "all_dead") return { ...next, waiting: null, finished: true };
  return { ...next, waiting: pool.status === "ready" ? null : pool.status };
}

/** The next objective after `Done`, or after the player ticks more regions while the run waits. */
export function rollNext(engine: Engine, run: Run): Run {
  if (run.finished || run.current !== null) return run;
  return rollObjective(engine, run, [], null);
}

/** Rerolls the target and everything after it; only the target avoids its current result. */
export function reroll(engine: Engine, run: Run, target: RerollTarget): Run {
  const objective = run.current;
  if (objective === null || run.finished) return run;
  const rerolls = [...objective.rerolls, target];

  if (target === "boss") return rollObjective(engine, run, rerolls, objective.boss);

  const { random, state } = seededRandom(run.rngState);
  if (target === "character_class") {
    const characterClass = rollCharacterClass(engine, run, random, objective.characterClass);
    const characterClassId = characterClass?.id ?? objective.characterClass;
    const loadout = rollSlots(engine, run, random, { boss: objective.boss, characterClass: characterClassId });
    const kept = traceBefore(objective.trace, "character_class");
    return {
      ...run,
      rngState: state(),
      current: {
        ...objective,
        characterClass: characterClassId,
        slots: loadout.slots,
        shortlistRh: loadout.shortlistRh ?? false,
        rerolls,
        trace: [...kept, ...(characterClass === null ? [] : [characterClass.block]), ...loadout.trace],
      },
    };
  }
  if (objective.slots[target] === undefined) return run;
  const loadout = rollSlots(
    engine,
    run,
    random,
    objective,
    target,
    objective.slots,
    objective.slots[target] ?? null,
  );
  return {
    ...run,
    rngState: state(),
    current: {
      ...objective,
      slots: loadout.slots,
      shortlistRh: loadout.shortlistRh ?? objective.shortlistRh,
      rerolls,
      trace: [...traceBefore(objective.trace, target), ...loadout.trace],
    },
  };
}

/** Marks the current boss dead and rerolls the full objective. The player didn't turn the boss down, so this
 * isn't a reroll: `rerolls` carries over without it. */
export function alreadyDead(engine: Engine, run: Run): Run {
  const objective = run.current;
  if (objective === null || run.finished) return run;
  const marked: Run = {
    ...run,
    deadBosses: [
      ...run.deadBosses,
      { instanceId: objective.boss, objectiveIndex: objectiveNumber(run) },
    ],
  };
  return rollObjective(engine, marked, objective.rerolls, null);
}

/** The current objective is discarded unless it was `Done`. */
export function finishRun(run: Run): Run {
  return { ...run, current: null, waiting: null, finished: true };
}
