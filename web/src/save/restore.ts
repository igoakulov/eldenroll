// Checks a save against the current data, so a save from older data or an older app never crashes
// (web/README.md#Saving).
import type { LoadoutSlot } from "../engine/database";
import type { RolledSlots } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import { LOADOUT_ORDER } from "../engine/loadout";
import {
  type CompletedObjective,
  type DeadBoss,
  type Engine,
  type Objective,
  type RerollTarget,
  type Run,
  type RunInputs,
  type Waiting,
  WAITING,
  reroll,
  rollNext,
} from "../engine/run";
import {
  DEFAULT_STATS,
  MAX_STAT,
  MIN_STAT,
  STATS,
  defaultSettings,
  derivedLevel,
  type Settings,
  type Stats,
} from "../engine/settings";
import type { TallyAdded } from "../engine/slotRoll";

export const SCHEMA_VERSION = 2;

/** The active run as stored. `runId` and `updatedAt` let copies from several devices merge later. */
export interface SavedRun {
  readonly schemaVersion: number;
  readonly runId: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly run: Run;
}

/** Start's inputs before a run exists. */
export interface Setup extends Required<RunInputs> {
  readonly schemaVersion: number;
}

/** What restoring needs from outside: ids and times are the browser's, never the engine's. */
export interface Fresh {
  readonly seed: () => number;
  readonly id: () => string;
  readonly now: () => string;
}

type Loose = Readonly<Record<string, unknown>>;

function record(value: unknown): Loose | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Loose) : null;
}

function strings(value: unknown, known: (id: string) => boolean = () => true): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((one): one is string => typeof one === "string" && known(one)))];
}

function text(value: unknown, fallback: () => string): string {
  return typeof value === "string" && value !== "" ? value : fallback();
}

function int32(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value === (value | 0) ? value : null;
}

function stats(value: unknown): Stats {
  const raw = record(value) ?? {};
  const out = { ...DEFAULT_STATS } as Record<(typeof STATS)[number], number>;
  for (const stat of STATS) {
    const entered = raw[stat];
    if (typeof entered === "number" && Number.isInteger(entered) && entered >= MIN_STAT && entered <= MAX_STAT)
      out[stat] = entered;
  }
  return out;
}

function settings(data: EngineData, value: unknown): Settings {
  const raw = record(value) ?? {};
  const defaults = defaultSettings(data.database);
  const known = new Set(defaults.characterClasses);
  const characterClasses = strings(raw.characterClasses, (id) => known.has(id));
  const gap = raw.maxStatGap;
  return {
    maxStatGap: typeof gap === "number" && Number.isInteger(gap) && gap >= 0 ? gap : defaults.maxStatGap,
    characterClasses: characterClasses.length > 0 ? characterClasses : defaults.characterClasses,
    weaponShortlistEnabled:
      typeof raw.weaponShortlistEnabled === "boolean" ? raw.weaponShortlistEnabled : defaults.weaponShortlistEnabled,
  };
}

/** An `optionKey`, `kind:id`, whose row still exists. */
function knownOptionKey(data: EngineData, key: string): boolean {
  const at = key.indexOf(":");
  const kind = key.slice(0, at);
  const id = key.slice(at + 1);
  if (kind === "item") return data.items.has(id);
  if (kind === "rule") return data.rules.has(id);
  if (kind === "armor_set") return data.armorSets.has(id);
  return false;
}

function knownSlotId(data: EngineData, slot: LoadoutSlot, id: string): boolean {
  if (slot === "rule") return data.rules.has(id);
  if (slot === "armor") return data.armorSets.has(id);
  return data.items.has(id);
}

const LOADOUT_SLOTS: ReadonlySet<string> = new Set(LOADOUT_ORDER);
const REROLL_TARGETS: ReadonlySet<string> = new Set(["boss", "character_class", ...LOADOUT_ORDER]);

/** Keeps every slot it can read, ids gone from the data included. */
function slots(value: unknown): RolledSlots {
  const out: Partial<Record<LoadoutSlot, string | null>> = {};
  for (const [slot, id] of Object.entries(record(value) ?? {})) {
    if (!LOADOUT_SLOTS.has(slot)) continue;
    if (id === null || typeof id === "string") out[slot as LoadoutSlot] = id;
  }
  return out;
}

function rerolls(value: unknown): RerollTarget[] {
  return Array.isArray(value)
    ? value.filter((one): one is RerollTarget => typeof one === "string" && REROLL_TARGETS.has(one))
    : [];
}

/** Repeats kept: each is one time an id was replaced. An id gone from the data stays, for the summary to name. */
function replaced(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((one): one is string => typeof one === "string") : [];
}

function tally(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, chance] of Object.entries(record(value) ?? {}))
    if (typeof chance === "number" && Number.isFinite(chance)) out[key] = chance;
  return out;
}

/** What a completed objective and the current one both hold; `null` when it names no boss or class. */
function objectiveRead(value: unknown): { readonly raw: Loose; readonly base: Omit<Objective, "tally"> } | null {
  const raw = record(value);
  if (raw === null || typeof raw.boss !== "string" || typeof raw.characterClass !== "string") return null;
  return {
    raw,
    base: {
      boss: raw.boss,
      characterClass: raw.characterClass,
      slots: slots(raw.slots),
      shortlistRh: raw.shortlistRh === true,
      rerolls: rerolls(raw.rerolls),
      replaced: replaced(raw.replaced),
    },
  };
}

/** A finished objective is kept even when its ids are gone from the data: the run view shows what it can. */
function completed(value: unknown): CompletedObjective[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((one: unknown) => {
    const read = objectiveRead(one);
    if (read === null) return [];
    const at = stats(read.raw.stats);
    return [{ ...read.base, stats: at, level: derivedLevel(at) }];
  });
}

/** The objective as saved, and the first step in roll order whose id is gone from the data, which must reroll: a
 * gone id would break a later reroll. */
function current(
  data: EngineData,
  value: unknown,
): { readonly objective: Objective; readonly gone: RerollTarget | null } | null {
  const read = objectiveRead(value);
  if (read === null) return null;
  const { raw, base } = read;
  const gone: RerollTarget | null = !data.bosses.has(base.boss)
    ? "boss"
    : !data.database.character_class.some((row) => row.id === base.characterClass)
      ? "character_class"
      : (LOADOUT_ORDER.find((slot) => {
          const id = base.slots[slot];
          return typeof id === "string" && !knownSlotId(data, slot, id);
        }) ?? null);
  const slotTally: Partial<Record<LoadoutSlot, TallyAdded>> = {};
  for (const [slot, added] of Object.entries(record(raw.tally) ?? {}))
    if (LOADOUT_SLOTS.has(slot)) slotTally[slot as LoadoutSlot] = tally(added);
  return { objective: { ...base, tally: slotTally }, gone };
}

/** Rerolls from the gone step on, as the reroll slider would, so gear fetched for the slots before it stays. The
 * player didn't ask for it, so it isn't counted as their reroll. */
function repaired(engine: Engine, run: Run, gone: RerollTarget): Run {
  const next = reroll(engine, run, gone);
  if (next.current === null || run.current === null) return next;
  const { rerolls: before, replaced: kept } = run.current;
  return { ...next, current: { ...next.current, rerolls: before, replaced: kept } };
}

function deadBosses(data: EngineData, value: unknown): DeadBoss[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((one: unknown) => {
    const raw = record(one);
    const id = raw?.instanceId;
    const index = raw?.objectiveIndex;
    if (typeof id !== "string" || !data.bosses.has(id) || seen.has(id)) return [];
    seen.add(id);
    return [{ instanceId: id, objectiveIndex: typeof index === "number" && Number.isInteger(index) && index >= 0 ? index : 0 }];
  });
}

const WAITING_STATES: ReadonlySet<string> = new Set(WAITING);

/** The inputs a run and Start's setup both hold; dead bosses differ in shape, so each reads its own. */
function inputs(data: EngineData, raw: Loose): Omit<Required<RunInputs>, "deadBosses"> {
  const regionIds = new Set(data.database.region.map((row) => row.id));
  return {
    stats: stats(raw.stats),
    settings: settings(data, raw.settings),
    regions: strings(raw.regions, (id) => regionIds.has(id)),
    weaponShortlist: strings(raw.weaponShortlist, (id) => data.items.has(id)),
    neverRoll: strings(raw.neverRoll, (key) => knownOptionKey(data, key)),
    skippedBosses: strings(raw.skippedBosses, (id) => data.bosses.has(id)),
  };
}

/** Keeps whatever it can read. `null` only when nothing of a run is there. */
export function restoreRun(engine: Engine, value: unknown, fresh: Fresh): SavedRun | null {
  const envelope = record(value);
  const raw = record(envelope?.run);
  if (envelope === null || raw === null) return null;
  const data = engine.data;
  const seed = int32(raw.seed) ?? fresh.seed();
  const saved = current(data, raw.current);
  const objective = saved?.objective ?? null;
  const waiting = typeof raw.waiting === "string" && WAITING_STATES.has(raw.waiting) ? (raw.waiting as Waiting) : null;
  const finished = raw.finished === true;
  const run: Run = {
    seed,
    rngState: int32(raw.rngState) ?? seed,
    finished,
    ...inputs(data, raw),
    deadBosses: deadBosses(data, raw.deadBosses),
    current: objective,
    waiting: objective === null ? waiting : null,
    completed: completed(raw.completed),
    tally: tally(raw.tally),
  };
  // An objective too broken to read rolls anew; a run saved between objectives stays there
  const lost = raw.current != null && objective === null;
  const restored = finished
    ? run
    : lost
      ? rollNext(engine, run)
      : saved?.gone
        ? repaired(engine, run, saved.gone)
        : run;
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: text(envelope.runId, fresh.id),
    startedAt: text(envelope.startedAt, fresh.now),
    updatedAt: text(envelope.updatedAt, fresh.now),
    run: restored,
  };
}

export function restoreSetup(data: EngineData, value: unknown): Setup | null {
  const raw = record(value);
  if (raw === null) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    ...inputs(data, raw),
    deadBosses: strings(raw.deadBosses, (id) => data.bosses.has(id)),
  };
}
