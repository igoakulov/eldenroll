import { copy } from "../copy";
import { isNone, type LoadoutSlot } from "./database";
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
import { addTally, type Random, type RollObserver, type TallyAdded } from "./slotRoll";

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
  /** The ids those rerolls replaced, once per time, for `Most rerolled`: what `REROLL_NAMES` lists. */
  readonly replaced: readonly string[];
  /** What each slot's roll adds to `Run.tally` once the objective is done; a reroll replaces its slot's. */
  readonly tally: Readonly<Partial<Record<LoadoutSlot, TallyAdded>>>;
}

/** Leaves out `tally`: `Done` adds it to `Run.tally`, and stored on every objective it would fill the browser's storage. */
export interface CompletedObjective extends Omit<Objective, "tally"> {
  readonly stats: Stats;
  readonly level: number;
}

export const WAITING = ["no_region", "no_bosses", "regions_cleared"] as const;
export type Waiting = (typeof WAITING)[number];

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
  /** The chance each option with a location has had in the objectives done, rules left out, by `tallyKey`: what
   * catch-up evens out (`data/balance.md#Hyperparameters`). A rerolled or discarded roll adds nothing.
   * `<tallyKey>#left` also holds the share of the run left when the option first could roll, for its ceiling. */
  readonly tally: Readonly<Record<string, number>>;
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

function deadSet(run: Run): ReadonlySet<string> {
  return new Set(run.deadBosses.map((row) => row.instanceId));
}

function counted(engine: Engine, run: Run): ReadonlySet<string> {
  const reach = countedItems(engine.data, {
    locations: selectedLocations(engine.data.database, new Set(run.regions), deadSet(run)),
    deadBosses: deadSet(run),
  });
  return new Set([...reach, ...acquired(engine, run)]);
}

/** Gear shown on a done objective is the player's, so it stays in reach after its place drops out, such as the Royal
 * Capital once Maliketh falls (`web/src/engine/README.md#Eligibility`). */
function acquired(engine: Engine, run: Run): ReadonlySet<string> {
  const items = new Set<string>();
  for (const objective of run.completed) {
    for (const [slot, id] of Object.entries(objective.slots)) {
      if (id === null || id === undefined) continue;
      if (slot === "armor") for (const piece of engine.data.armorSets.get(id)?.pieces ?? []) items.add(piece);
      else if (engine.data.items.has(id)) items.add(id);
    }
  }
  return items;
}

function rollBoss(
  engine: Engine,
  run: Run,
  random: Random,
  exclude: string | null,
): { readonly id: string } | Exclude<BossPool["status"], "ready"> {
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
  return { id: picked.value.id };
}

function rollCharacterClass(engine: Engine, run: Run, random: Random, exclude: string | null): string | null {
  const rows = engine.data.database.character_class
    .filter((row) => run.settings.characterClasses.includes(row.id))
    .map((row) => ({ value: row, weight: row.odds }));
  const others = rows.filter((row) => row.value.id !== exclude);
  const candidates = others.length > 0 ? others : rows;
  const picked = pickWeighted(candidates, random);
  return picked?.value.id ?? null;
}

interface RolledSlotsResult {
  readonly slots: RolledSlots;
  readonly shortlistRh: boolean | null;
  readonly tally: Partial<Record<LoadoutSlot, TallyAdded>>;
}

/** The share of the game's rollable bosses still alive, for the runway ceiling: a player may tick regions as they
 * reach them, so the run's own regions don't tell its length. */
function runLeft(engine: Engine, run: Run): number {
  const total = engine.data.database.boss_instance.filter((row) => row.odds > 0).length;
  return total === 0 ? 1 : Math.max(0, 1 - run.deadBosses.length / total);
}

/** The bosses that may still be an objective in this run; the current one counts until it is felled. */
function aliveBosses(engine: Engine, run: Run): ReadonlySet<string> {
  const pool = bossPool(engine.data.database, new Set(run.regions), deadSet(run), new Set(run.skippedBosses));
  return new Set(pool.status === "ready" ? pool.bosses.map((row) => row.id) : []);
}

function rollSlots(
  engine: Engine,
  run: Run,
  random: Random,
  objective: { boss: string; characterClass: string },
  from: LoadoutSlot = "rh",
  kept: RolledSlots = {},
  exclude: string | null = null,
  keptTally: Readonly<Partial<Record<LoadoutSlot, TallyAdded>>> = {},
): RolledSlotsResult {
  const loadout = rollLoadout({
    data: engine.data,
    characterClass: objective.characterClass,
    boss: objective.boss,
    counted: counted(engine, run),
    limits: { stats: run.stats, maxStatGap: run.settings.maxStatGap },
    random,
    catchUp: engine.hyperparams.catchUp,
    fixedShare: engine.hyperparams.fixedShare,
    tally: run.tally,
    left: runLeft(engine, run),
    alive: aliveBosses(engine, run),
    keptTally,
    shortlist: run.settings.weaponShortlistEnabled ? new Set(run.weaponShortlist) : null,
    neverRoll: new Set(run.neverRoll),
    from,
    kept,
    exclude,
    ...(engine.observe === undefined ? {} : { observe: engine.observe }),
  });
  const start = LOADOUT_ORDER.indexOf(from);
  const slots: Partial<Record<LoadoutSlot, string | null>> = {};
  const tally: Partial<Record<LoadoutSlot, TallyAdded>> = {};
  for (const slot of LOADOUT_ORDER.slice(0, start)) {
    if (kept[slot] !== undefined) slots[slot] = kept[slot];
    if (keptTally[slot] !== undefined) tally[slot] = keptTally[slot];
  }
  for (const [slot, roll] of loadout) {
    slots[slot] = roll.chosen?.option.row.id ?? null;
    tally[slot] = roll.tally;
  }
  const rh = loadout.get("rh");
  return { slots, shortlistRh: rh === undefined ? null : rh.fromShortlist, tally };
}

function stopped(run: Run, status: Exclude<BossPool["status"], "ready">, rngState: number): Run {
  if (status === "all_dead") return { ...run, rngState, current: null, waiting: null, finished: true };
  return { ...run, rngState, current: null, waiting: status };
}

type Rerolled = Pick<Objective, "rerolls" | "replaced">;

const NO_REROLLS: Rerolled = { rerolls: [], replaced: [] };

/** Rolls a whole new objective, or leaves the run waiting or finished when no boss can roll. */
function rollObjective(engine: Engine, run: Run, carried: Rerolled, excludeBoss: string | null): Run {
  const { random, state } = seededRandom(run.rngState);
  const boss = rollBoss(engine, run, random, excludeBoss);
  if (typeof boss === "string") return stopped(run, boss, state());
  const characterClass = rollCharacterClass(engine, run, random, null);
  if (characterClass === null) return { ...run, rngState: state(), current: null, waiting: null };
  const loadout = rollSlots(engine, run, random, { boss: boss.id, characterClass });
  return {
    ...run,
    rngState: state(),
    waiting: null,
    current: {
      boss: boss.id,
      characterClass,
      slots: loadout.slots,
      shortlistRh: loadout.shortlistRh ?? false,
      rerolls: carried.rerolls,
      replaced: carried.replaced,
      tally: loadout.tally,
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
    tally: {},
  };
  return { ok: true, run: rollObjective(engine, run, NO_REROLLS, null) };
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

/** The `Bosses` list; like any edit, it applies on the next roll. */
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

export function done(engine: Engine, run: Run): Run {
  const objective = run.current;
  if (objective === null || run.finished) return run;
  const { tally, ...kept } = objective;
  const completed: CompletedObjective = {
    ...kept,
    stats: run.stats,
    level: derivedLevel(run.stats),
  };
  const next: Run = {
    ...run,
    tally: addTally(run.tally, ...Object.values(tally)),
    completed: [...run.completed, completed],
    deadBosses: [
      ...run.deadBosses,
      { instanceId: objective.boss, objectiveIndex: objectiveNumber(run) },
    ],
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
  return rollObjective(engine, run, NO_REROLLS, null);
}

type Named = "boss" | "character_class" | LoadoutSlot;

/** What a reroll counts as replaced: what its stop names, so the armor every reroll redoes, and the ashes, count only
 * when they are the target (web/README.md#Summary). */
const REROLL_NAMES: Readonly<Record<RerollTarget, readonly Named[]>> = {
  boss: ["boss"],
  character_class: ["character_class"],
  rh: ["rh", "lh"],
  rh_ash: [],
  lh: ["lh"],
  lh_ash: [],
  spell: ["spell"],
  item: ["item"],
  talisman_1: ["talisman_1", "talisman_2"],
  talisman_2: ["talisman_2"],
  rule: ["rule"],
  armor: ["armor"],
};

function named(objective: Objective, key: Named): string | null {
  if (key === "boss") return objective.boss;
  if (key === "character_class") return objective.characterClass;
  return objective.slots[key] ?? null;
}

/** Rerolls the target and everything after it; only the target avoids its current result. A named result that came
 * back the same wasn't replaced, and an empty one replaced nothing. */
export function reroll(engine: Engine, run: Run, target: RerollTarget): Run {
  const objective = run.current;
  if (objective === null || run.finished) return run;
  const next = rerolled(engine, run, objective, target);
  if (next === run || next.current === null) return next;
  const after = next.current;
  const replaced = REROLL_NAMES[target].flatMap((key) => {
    const was = named(objective, key);
    return was === null || isNone(was) || was === named(after, key) ? [] : [was];
  });
  return {
    ...next,
    current: { ...after, rerolls: [...objective.rerolls, target], replaced: [...objective.replaced, ...replaced] },
  };
}

function rerolled(engine: Engine, run: Run, objective: Objective, target: RerollTarget): Run {
  if (target === "boss") return rollObjective(engine, run, objective, objective.boss);

  const { random, state } = seededRandom(run.rngState);
  if (target === "character_class") {
    const characterClass = rollCharacterClass(engine, run, random, objective.characterClass);
    const characterClassId = characterClass ?? objective.characterClass;
    const loadout = rollSlots(engine, run, random, { boss: objective.boss, characterClass: characterClassId });
    return {
      ...run,
      rngState: state(),
      current: {
        ...objective,
        characterClass: characterClassId,
        slots: loadout.slots,
        shortlistRh: loadout.shortlistRh ?? false,
        tally: loadout.tally,
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
    objective.tally,
  );
  return {
    ...run,
    rngState: state(),
    current: {
      ...objective,
      slots: loadout.slots,
      shortlistRh: loadout.shortlistRh ?? objective.shortlistRh,
      tally: loadout.tally,
    },
  };
}

/** Marks the current boss dead and rerolls the full objective. The player didn't turn the boss down, so this
 * isn't a reroll: `rerolls` and `replaced` carry over without it. */
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
  return rollObjective(engine, marked, objective, null);
}

/** The current objective is discarded unless it was `Done`. */
export function finishRun(run: Run): Run {
  return { ...run, current: null, waiting: null, finished: true };
}
