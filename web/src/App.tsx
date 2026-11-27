import { useEffect, useMemo, useRef, useState } from "react";

import {
  bossChanges,
  settingsChanges,
  startAnalytics,
  trackError,
  trackHowItWorks,
  trackObjectiveDone,
  trackRunFinished,
  trackRunStarted,
  trackSettingsSaved,
  type RunEnd,
} from "./analytics";
import { copy } from "./copy";
import type { Database } from "./engine/database";
import { indexDatabase } from "./engine/engineData";
import { DEFAULT_HYPERPARAMS } from "./engine/hyperparams";
import { DEFAULT_REGIONS } from "./engine/regions";
import {
  alreadyDead,
  done,
  editRun,
  finishRun,
  objectiveNumber,
  reroll,
  rollNext,
  setBossState,
  startRun,
  type Engine,
  type Run,
} from "./engine/run";
import { DEFAULT_STATS, defaultSettings, type Stats } from "./engine/settings";
import { loadDatabase } from "./loadDatabase";
import { FINISHED_RUNS_CAP, packFinished, recordOf, unpackAll, type Finished } from "./save/finished";
import { SCHEMA_VERSION, restoreRun, restoreSetup, type Fresh, type SavedRun, type Setup } from "./save/restore";
import { browserStore, type SaveStore } from "./save/store";
import { useDefaultKeys } from "./ui/keys";
import { PhoneFrame } from "./ui/PhoneFrame";
import { plainScreen, slideScreen } from "./ui/slideScreen";
import { boardBefore, boardOf, countState, inState } from "./views/bossList";
import { AllRuns } from "./views/AllRuns";
import { Bosses } from "./views/Bosses";
import { Card, hasObjective, type Reveal } from "./views/Card";
import { Felled } from "./views/Felled";
import { neverRollEntries, shortlistEntries } from "./views/gearList";
import { LevelUp } from "./views/LevelUp";
import { rerollTarget } from "./views/rerollScope";
import { HowItWorks } from "./views/HowItWorks";
import { RunView, currentHeading, finishedHeading } from "./views/RunView";
import { runTitle, type RunMenuActions } from "./views/RunMenu";
import { RunSettings, type RunLists, type SettingsTab } from "./views/RunSettings";
import { Start, StartFailed, StartLoading, StartResume } from "./views/Start";

interface Boot {
  readonly database: Database;
  readonly engine: Engine;
  readonly saved: SavedRun | null;
  readonly setup: Setup | null;
  /** The finished runs kept, newest first. */
  readonly finished: readonly Finished[];
}

type Loaded = { readonly status: "loading" } | ({ readonly status: "ready" } & Boot) | { readonly status: "failed" };

type View = "start" | "card" | "howItWorks" | "felled" | "rerolling" | "level" | "settings" | "run" | "runs";

// Full screens open over home, or the run's view over `All runs`, and rise in the Home Screen app; one that rose falls
// away when it closes (web/src/ui/README.md#Controls). `Level up` after `Done` follows the felled screen instead.
const HOME: ReadonlySet<View> = new Set(["start", "card"]);
const FULL: ReadonlySet<View> = new Set(["howItWorks", "level", "settings", "run", "runs"]);

function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

const FRESH: Fresh = {
  seed: newSeed,
  // `randomUUID` exists only on https and localhost; a phone testing over the local network has neither
  id: () =>
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  now: () => new Date().toISOString(),
};

const store: SaveStore = browserStore();

/** Restores the saves once the data has loaded. A run saved as finished, as when the app closed on its last step,
 * is kept with the finished runs. */
async function restore(): Promise<Boot> {
  const [database, stored] = await Promise.all([loadDatabase(), store.load()]);
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  let saved = restoreRun(engine, stored.active, FRESH);
  if (saved === null && stored.active !== null) {
    store.setAsideActive();
    trackError("save set aside");
  }
  let kept = stored.finished;
  if (saved?.run.finished === true) {
    // It ended when it was last saved, not when the app opened again
    finishSaved(saved, saved.run, saved.updatedAt);
    saved = null;
    kept = (await store.load()).finished;
  }
  return { database, engine, saved, setup: saved === null ? restoreSetup(engine.data, stored.setup) : null, finished: unpackAll(kept) };
}

// Restoring writes to the store, so it runs once even where React runs an effect twice; a failed load may retry
let restoring: Promise<Boot> | null = null;
function boot(): Promise<Boot> {
  restoring ??= restore().catch((error: unknown) => {
    restoring = null;
    throw error;
  });
  return restoring;
}

type Identity = Pick<SavedRun, "runId" | "startedAt">;

/** A run with no completed objective isn't kept (web/README.md#All runs): `null` then. */
function finishSaved(identity: Identity, run: Run, finishedAt = FRESH.now()): Finished | null {
  store.saveActive(null);
  if (run.completed.length === 0) return null;
  const meta = { runId: identity.runId, startedAt: identity.startedAt, finishedAt };
  store.addFinished(packFinished(run, meta));
  return { ...meta, ...recordOf(run) };
}

function Game({ database, engine, saved, setup, finished: keptRuns }: Boot) {
  const [finished, setFinished] = useState(keptRuns);
  const rollableBosses = useMemo(() => database.boss_instance.filter((boss) => boss.odds > 0), [database]);
  const gear = useMemo(
    () => ({ neverRoll: neverRollEntries(database), shortlist: shortlistEntries(database) }),
    [database],
  );
  // Before a run; once one starts, the run holds its own
  const [settings, setSettings] = useState(() => setup?.settings ?? defaultSettings(database));
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [stats, setStats] = useState<Stats>(setup?.stats ?? DEFAULT_STATS);
  const [regions, setRegions] = useState<readonly string[]>(setup?.regions ?? DEFAULT_REGIONS);
  const [deadBosses, setDeadBosses] = useState<readonly string[]>(setup?.deadBosses ?? []);
  const [skippedBosses, setSkippedBosses] = useState<readonly string[]>(setup?.skippedBosses ?? []);
  const [lists, setLists] = useState<RunLists>({
    neverRoll: setup?.neverRoll ?? [],
    weaponShortlist: setup?.weaponShortlist ?? [],
  });
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [run, setRun] = useState<Run | null>(saved?.run ?? null);
  // Worked out once per change to the run, so the view's summary isn't redone on every render
  const currentRecord = useMemo(() => (run === null ? null : recordOf(run)), [run]);
  // The run's identity in its save; set when it starts
  const identity = useRef<Identity | null>(saved === null ? null : { runId: saved.runId, startedAt: saved.startedAt });
  /** Every change to the run goes through here, so the save always holds the run on screen. */
  const commit = (next: Run) => {
    identity.current ??= { runId: FRESH.id(), startedAt: FRESH.now() };
    const { runId, startedAt } = identity.current;
    setRun(next);
    store.saveActive({ schemaVersion: SCHEMA_VERSION, runId, startedAt, updatedAt: FRESH.now(), run: next });
  };

  // Start's setup is saved as it is edited, until a run takes it
  useEffect(() => {
    if (run !== null) return;
    store.saveSetup({ schemaVersion: SCHEMA_VERSION, stats, settings, regions, ...lists, deadBosses, skippedBosses });
  }, [run, stats, settings, regions, lists, deadBosses, skippedBosses]);
  const [view, setViewNow] = useState<View>("start");
  const shown = useRef<View>(view);
  shown.current = view;
  // The full screens that rose, the top one showing
  const risen = useRef<View[]>([]);
  /** `along` holds the other changes that come with the screen, so a slide moves from the screen as it was. */
  const setView = (next: View, along: () => void = () => {}) => {
    const from = shown.current;
    shown.current = next;
    const update = () => {
      along();
      setViewNow(next);
    };
    if (FULL.has(next) && (HOME.has(from) || (from === "runs" && next === "run"))) {
      risen.current.push(next);
      slideScreen("open", update);
    } else if (next !== from && risen.current.at(-1) === from) {
      risen.current.pop();
      slideScreen("close", update);
    } else {
      plainScreen();
      update();
    }
    if (HOME.has(next)) risen.current = [];
  };
  // How it works closes back to where it opened: Start, or the screen whose menu opened it
  const [howItWorksFromMenu, setHowItWorksFromMenu] = useState(false);
  // The run as it was before `Done` or `Felled?`, which `Undo` puts back
  const [undoTo, setUndoTo] = useState<Run | null>(null);
  const [reveal, setReveal] = useState<{ readonly kind: Reveal; readonly id: number }>({ kind: "none", id: 0 });
  const showCard = (kind: Reveal) => {
    setReveal((r) => ({ kind, id: r.id + 1 }));
    setView("card");
  };

  // Another tab saved or ended the run: this one shows the newer run on Start
  useEffect(
    () =>
      store.onActiveChange((value) => {
        // A run the other tab finished is on its way to the finished runs, so here it is no run
        const restored = value === null ? null : restoreRun(engine, value, FRESH);
        const other = restored?.run.finished === true ? null : restored;
        identity.current = other === null ? null : { runId: other.runId, startedAt: other.startedAt };
        setRun(other?.run ?? null);
        setUndoTo(null);
        setOpened(null);
        setView("start");
        // It may have finished a run too, so the list is read again
        void store.load().then((stored) => setFinished(unpackAll(stored.finished)));
      }),
    [engine],
  );

  // A finished run's view, over Start after `Finish run` or over `All runs`; `null` while the view shows the run in
  // progress
  const [opened, setOpened] = useState<{ readonly finished: Finished; readonly fromList: boolean } | null>(null);
  // Start opens fresh after a run, under the run's view when `show` asks for it and the run was kept
  const endRun = (finished: Run, how: RunEnd, show = false) => {
    if (identity.current !== null) trackRunFinished(finished, identity.current, how);
    const kept = identity.current === null ? null : finishSaved(identity.current, finished);
    identity.current = null;
    setView(show && kept !== null ? "run" : "start", () => {
      if (kept !== null)
        setFinished((list) => [kept, ...list.filter((one) => one.runId !== kept.runId)].slice(0, FINISHED_RUNS_CAP));
      setOpened(show && kept !== null ? { finished: kept, fromList: false } : null);
      setRun(null);
      setUndoTo(null);
      setStats(DEFAULT_STATS);
      setRegions(DEFAULT_REGIONS);
      setSettings(defaultSettings(database));
      setDeadBosses([]);
      setSkippedBosses([]);
      setLists({ neverRoll: [], weaponShortlist: [] });
      setProblems([]);
    });
  };
  const menu = (current: Run): RunMenuActions => ({
    finishedRuns: finished.length,
    onRuns: () => setView("runs"),
    onSummary: () => {
      setOpened(null);
      setView("run");
    },
    onHome: () => setView("start"),
    onHowItWorks: () => openHowItWorks(true),
    onRunSettings: () => setView("settings"),
    onFinish: () => endRun(finishRun(current), "finish", true),
  });
  const openHowItWorks = (fromMenu: boolean) => {
    trackHowItWorks(fromMenu ? "menu" : "tagline", run !== null);
    setHowItWorksFromMenu(fromMenu);
    setView("howItWorks");
  };
  // Home: the card while a run has an objective, `Level up` between objectives, Start otherwise
  const home = () => {
    if (run === null) setView("start");
    else if (run.current === null) setView("level");
    else showCard("none");
  };

  if (view === "run" && opened !== null) {
    const shown = opened.finished;
    const last = shown.objectives.at(-1);
    // Back to the list it was opened from, or to Start after `Finish run`; with nothing left to list, to Start
    const back = (remaining: number, along: () => void = () => {}) =>
      setView(opened.fromList && (run !== null || remaining > 0) ? "runs" : "start", () => {
        setOpened(null);
        along();
      });
    return (
      <RunView
        key={shown.runId}
        data={engine.data}
        eyebrow={copy.runView.finished}
        heading={finishedHeading(engine.data, shown)}
        stats={last?.stats ?? DEFAULT_STATS}
        record={shown}
        onClose={() => back(finished.length)}
        onDelete={() => {
          store.deleteFinished(shown.runId);
          back(finished.length - 1, () => setFinished((list) => list.filter((one) => one.runId !== shown.runId)));
        }}
      />
    );
  }

  if (view === "runs")
    return (
      <AllRuns
        data={engine.data}
        run={run}
        finished={finished}
        onResume={home}
        onOpen={(one) => {
          setOpened({ finished: one, fromList: true });
          setView("run");
        }}
        onClose={home}
      />
    );

  if (view === "run" && run !== null)
    return (
      <RunView
        data={engine.data}
        eyebrow={copy.runView.current}
        heading={currentHeading(engine.data, run)}
        stats={run.stats}
        record={currentRecord ?? recordOf(run)}
        onClose={home}
      />
    );

  if (view === "howItWorks")
    return <HowItWorks onClose={() => (howItWorksFromMenu ? home() : setView("start"))} onHome={() => setView("start")} />;

  if (view === "settings") {
    // Settings belong to the run, not to one objective
    const eyebrow = run === null ? copy.common.newRun : copy.runView.current;
    const board = run === null ? boardBefore(deadBosses, skippedBosses) : boardOf(run);
    return (
      <RunSettings
        eyebrow={eyebrow}
        settings={run?.settings ?? settings}
        lists={run === null ? lists : { neverRoll: run.neverRoll, weaponShortlist: run.weaponShortlist }}
        gear={gear}
        characterClasses={database.character_class}
        tab={settingsTab}
        onTab={setSettingsTab}
        bossCounts={{ felled: countState(board, "dead"), skipped: countState(board, "skipped") }}
        bosses={(back) => (
          <Bosses
            eyebrow={eyebrow}
            bosses={rollableBosses}
            board={board}
            onClose={back}
            onSave={(changes) => {
              if (run === null) {
                const states = new Map([...board.states, ...changes]);
                setDeadBosses(inState(rollableBosses, states, "dead"));
                setSkippedBosses(inState(rollableBosses, states, "skipped"));
                setProblems([]);
              } else {
                let next = run;
                for (const [boss, state] of changes) next = setBossState(engine, next, boss, state);
                commit(next);
                const changed = bossChanges(changes);
                if (changed !== null && identity.current !== null)
                  trackSettingsSaved(identity.current, objectiveNumber(run), "bosses", changed);
              }
              back();
            }}
          />
        )}
        onClose={home}
        onSave={(next, nextLists) => {
          if (run === null) {
            setSettings(next);
            setLists(nextLists);
            setProblems([]);
          } else {
            commit(
              editRun(run, {
                settings: next,
                neverRoll: nextLists.neverRoll,
                weaponShortlist: nextLists.weaponShortlist,
              }),
            );
            const changed = settingsChanges(
              { settings: run.settings, neverRoll: run.neverRoll, weaponShortlist: run.weaponShortlist },
              { settings: next, ...nextLists },
            );
            if (changed !== null && identity.current !== null)
              trackSettingsSaved(identity.current, objectiveNumber(run), settingsTab, changed);
          }
          home();
        }}
      />
    );
  }

  if ((view === "felled" || view === "rerolling") && run !== null && undoTo !== null && hasObjective(undoTo)) {
    const boss = engine.data.bosses.get(undoTo.current.boss);
    const noop = () => {};
    return (
      <Felled
        bossName={boss?.name ?? copy.common.unknownBoss}
        label={view === "felled" ? copy.felled.nextObjectiveIn : copy.felled.rerollingIn}
        behind={
          <Card
            data={engine.data}
            run={undoTo}
            reveal="none"
            onReroll={noop}
            onDone={noop}
            onFelled={noop}
            onLevelUp={noop}
          />
        }
        onUndo={() => {
          commit(undoTo);
          setUndoTo(null);
          showCard("none");
        }}
        onZero={() => {
          setUndoTo(null);
          // Sent once `Undo` is gone, so an undone `Done` sends nothing
          if (view === "felled" && identity.current !== null) trackObjectiveDone(run, identity.current);
          // Every boss felled or skipped: the run ends by itself, as `Finish run` ends it
          if (run.finished) {
            endRun(run, "all_felled", true);
          } else if (view === "rerolling" && run.current !== null) {
            showCard("quick");
          } else {
            // After `Felled?` too, when no boss is left in the regions: `Level up` is where more are ticked
            setView("level");
          }
        }}
      />
    );
  }

  // A run with no objective, as after a reroll that finds no class to roll, waits on `Level up`
  if (run !== null && (view === "level" || (view === "card" && run.current === null))) {
    const mid = run.current !== null;
    return (
      <LevelUp
        mode={mid ? "mid" : "next"}
        run={run}
        regions={database.region}
        onClose={() => showCard("none")}
        menu={menu(run)}
        onSave={(changes) => {
          const edited = editRun(run, changes);
          if (mid) {
            commit(edited);
            showCard("none");
            return;
          }
          // With no living boss in the selected regions, the run stays here, waiting for more
          const next = rollNext(engine, edited);
          commit(next);
          // No boss left anywhere: the run ends by itself, as `Finish run` ends it
          if (next.finished) endRun(next, "all_felled", true);
          else if (next.current !== null) showCard("full");
        }}
      />
    );
  }

  if (view === "card" && run !== null && hasObjective(run)) {
    return (
      <Card
        key={reveal.id}
        data={engine.data}
        run={run}
        reveal={reveal.kind}
        onReroll={(target) => {
          const next = reroll(engine, run, rerollTarget(run.current.slots, target));
          commit(next);
          // Only a full-objective reroll replays the reveal; any other keeps the card and swaps what changed
          if (target === "boss") showCard("quick");
        }}
        onDone={() => {
          setUndoTo(run);
          commit(done(engine, run));
          setView("felled");
        }}
        onFelled={() => {
          const next = alreadyDead(engine, run);
          setUndoTo(run);
          commit(next);
          setView("rerolling");
        }}
        onLevelUp={() => setView("level")}
        menu={menu(run)}
      />
    );
  }

  if (run !== null) {
    return (
      <StartResume
        run={run}
        title={runTitle(engine.data, run)}
        onHowItWorks={() => openHowItWorks(false)}
        onResume={home}
        finishedRuns={finished.length}
        onRuns={() => setView("runs")}
        onNewRun={() => endRun(finishRun(run), "new_run")}
      />
    );
  }

  return (
    <Start
      regions={database.region}
      stats={stats}
      selectedRegions={regions}
      problems={problems}
      onStats={(next) => {
        setStats(next);
        setProblems([]);
      }}
      onRegions={(next) => {
        setRegions(next);
        setProblems([]);
      }}
      onHowItWorks={() => openHowItWorks(false)}
      onRunSettings={() => setView("settings")}
      finishedRuns={finished.length}
      onRuns={() => setView("runs")}
      onStartRun={() => {
        const result = startRun(
          engine,
          { stats, settings, regions, ...lists, deadBosses, skippedBosses },
          newSeed(),
        );
        if (!result.ok) {
          setProblems(result.problems);
          return;
        }
        setProblems([]);
        store.saveSetup(null);
        commit(result.run);
        if (identity.current !== null)
          trackRunStarted(database, result.run, identity.current, {
            finishedRuns: finished.length,
            firstStartedAt: finished.map((one) => one.startedAt).sort()[0] ?? null,
          });
        showCard("full");
      }}
    />
  );
}

export function App() {
  useDefaultKeys();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    boot()
      .then((loaded) => {
        if (current) setState({ status: "ready", ...loaded });
        startAnalytics();
      })
      .catch((error: unknown) => {
        console.error(error);
        if (current) setState({ status: "failed" });
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <PhoneFrame>
      {state.status === "ready" ? (
        <Game database={state.database} engine={state.engine} saved={state.saved} setup={state.setup} finished={state.finished} />
      ) : state.status === "loading" ? (
        <StartLoading />
      ) : (
        <StartFailed
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        />
      )}
    </PhoneFrame>
  );
}
