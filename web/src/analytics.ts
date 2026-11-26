import type { PostHog } from "posthog-js/dist/module.slim";

import type { Database } from "./engine/database";
import type { BossState, Run } from "./engine/run";
import { derivedLevel, type Settings } from "./engine/settings";
import type { SettingsTab } from "./views/RunSettings";

// Anonymous run stats in PostHog (web/README.md#Analytics). Public by design: it can only send events
const TOKEN = "phc_mBVPeZZao8P4PgTGRiZWFQNY5HLVnakFCwHzw8q9o8fX";
const LIVE_HOST = "eldenroll.com";
const OWNER_KEY = "eldenroll.owner";
const DAY_MS = 24 * 60 * 60 * 1000;

type Value = string | number | boolean | null | readonly string[] | Readonly<Record<string, number>>;
type Props = Readonly<Record<string, Value>>;

export type RunEnd = "finish" | "new_run" | "all_felled";

let client: PostHog | null = null;
let started = false;
const queue: [string, Props][] = [];

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** This install sends its events tagged `owner`: the owner's own play and testing, kept but left out of charts. */
export function isOwner(): boolean {
  return storage()?.getItem(OWNER_KEY) === "1";
}

export function setOwner(on: boolean): void {
  if (on) storage()?.setItem(OWNER_KEY, "1");
  else storage()?.removeItem(OWNER_KEY);
  client?.register({ owner: on });
}

function installed(): boolean {
  return (
    globalThis.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { readonly standalone?: boolean }).standalone === true
  );
}

function send(event: string, props: Props): void {
  if (client === null) queue.push([event, props]);
  else client.capture(event, props);
}

/** Loads PostHog once the app shows, on the live site only: development and local builds never send. Events tracked
 * before it loads wait for it. */
export function startAnalytics(): void {
  if (started) return;
  started = true;
  if (globalThis.location?.hostname !== LIVE_HOST) return;
  addEventListener("error", (event) => send("error", { message: String(event.message) }));
  addEventListener("unhandledrejection", (event) => send("error", { message: String(event.reason) }));
  void import("posthog-js/dist/module.slim").then(({ posthog }) => {
    posthog.init(TOKEN, {
      // Through the site, so blockers that refuse PostHog's own address don't drop the events
      api_host: `${location.origin}/ingest`,
      ui_host: "https://us.posthog.com",
      cookieless_mode: "always",
      person_profiles: "never",
      // Only the events below: no automatic clicks, recordings, surveys, flags or anything loaded from PostHog
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_performance: false,
      capture_exceptions: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_conversations: true,
      disable_web_experiments: true,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
    });
    posthog.register({ installed: installed(), owner: isOwner() });
    posthog.capture("$pageview");
    client = posthog;
    for (const [event, props] of queue.splice(0)) posthog.capture(event, props);
  });
}

function days(since: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / DAY_MS));
}

export interface RunIdentity {
  readonly runId: string;
  readonly startedAt: string;
}

export function trackHowItWorks(from: "tagline" | "menu", runInProgress: boolean): void {
  send("how_it_works_opened", { from, run_in_progress: runInProgress });
}

/** `finishedRuns` and `firstStartedAt` are the device's history, read from the runs it keeps. */
export function trackRunStarted(
  database: Pick<Database, "character_class">,
  run: Run,
  identity: RunIdentity,
  history: { readonly finishedRuns: number; readonly firstStartedAt: string | null },
  now = new Date(),
): void {
  send("run_started", {
    run_id: identity.runId,
    level: derivedLevel(run.stats),
    stats: run.stats,
    regions: run.regions,
    classes_off: database.character_class
      .map((row) => row.id)
      .filter((id) => !run.settings.characterClasses.includes(id)),
    max_stat_gap: run.settings.maxStatGap,
    shortlist_size: run.weaponShortlist.length,
    shortlist_rolls: run.settings.weaponShortlistEnabled,
    never_roll: run.neverRoll,
    felled_before: run.deadBosses.length,
    skipped: run.skippedBosses.length,
    finished_runs: history.finishedRuns,
    days_since_first_run: history.firstStartedAt === null ? 0 : days(history.firstStartedAt, now),
  });
}

/** Sent with the run after `Done`. `replaced` holds what each reroll's target replaced, not the slots after it. */
export function trackObjectiveDone(run: Run, identity: RunIdentity, now = new Date()): void {
  const objective = run.completed.at(-1);
  if (objective === undefined) return;
  const number = run.completed.length;
  send("objective_done", {
    run_id: identity.runId,
    objective: number,
    boss: objective.boss,
    class: objective.characterClass,
    level: objective.level,
    stats: objective.stats,
    regions: run.regions,
    rerolls: objective.rerolls,
    replaced: objective.replaced,
    felled_on_the_way: run.deadBosses
      .filter((row) => row.objectiveIndex === number && row.instanceId !== objective.boss)
      .map((row) => row.instanceId),
    run_age_days: days(identity.startedAt, now),
  });
}

function added(before: readonly string[], after: readonly string[]): readonly string[] {
  return after.filter((id) => !before.includes(id));
}

/** What `Save` in `Run settings` changed, or `null` when nothing did. */
export function settingsChanges(
  before: { readonly settings: Settings; readonly neverRoll: readonly string[]; readonly weaponShortlist: readonly string[] },
  after: { readonly settings: Settings; readonly neverRoll: readonly string[]; readonly weaponShortlist: readonly string[] },
): Props | null {
  const changes: Record<string, Value> = {};
  const lists = [
    ["classes", before.settings.characterClasses, after.settings.characterClasses],
    ["never_roll", before.neverRoll, after.neverRoll],
    ["shortlist", before.weaponShortlist, after.weaponShortlist],
  ] as const;
  for (const [name, was, now] of lists) {
    const on = added(was, now);
    const off = added(now, was);
    if (on.length > 0) changes[`${name}_added`] = on;
    if (off.length > 0) changes[`${name}_removed`] = off;
  }
  if (before.settings.maxStatGap !== after.settings.maxStatGap) changes["max_stat_gap"] = after.settings.maxStatGap;
  if (before.settings.weaponShortlistEnabled !== after.settings.weaponShortlistEnabled)
    changes["shortlist_rolls"] = after.settings.weaponShortlistEnabled;
  return Object.keys(changes).length === 0 ? null : changes;
}

/** What `Save` in `Bosses` changed: the bosses by the state they were set to. */
export function bossChanges(changes: ReadonlyMap<string, BossState>): Props | null {
  if (changes.size === 0) return null;
  const by = (state: BossState) => [...changes].filter(([, to]) => to === state).map(([boss]) => boss);
  return { felled: by("dead"), skipped: by("skipped"), alive: by("alive") };
}

export function trackSettingsSaved(identity: RunIdentity, objective: number, tab: SettingsTab | "bosses", changes: Props): void {
  send("settings_saved", { run_id: identity.runId, objective, tab, ...changes });
}

export function trackRunFinished(run: Run, identity: RunIdentity, how: RunEnd, now = new Date()): void {
  send("run_finished", {
    run_id: identity.runId,
    how,
    objectives: run.completed.length,
    run_age_days: days(identity.startedAt, now),
  });
}

export function trackError(message: string): void {
  send("error", { message });
}
