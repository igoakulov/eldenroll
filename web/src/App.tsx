import { useEffect, useMemo, useState } from "react";

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
  startRun,
  type Engine,
  type Run,
} from "./engine/run";
import { DEFAULT_STATS, defaultSettings, type Stats } from "./engine/settings";
import { formatTrace } from "./engine/trace";
import { loadDatabase } from "./loadDatabase";
import { Lozenge } from "./ui/Icon";
import { Card, type Reveal } from "./views/Card";
import { Felled } from "./views/Felled";
import { LevelUp } from "./views/LevelUp";
import { rerollTarget } from "./views/rerollScope";
import { RoldCard } from "./views/RoldCard";
import { runTitle, type RunMenuActions } from "./views/RunMenu";
import { RunSettings, type SettingsTab } from "./views/RunSettings";
import { Start, StartResume } from "./views/Start";
import "./App.css";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed" };

type View = "start" | "card" | "rold" | "felled" | "rerolling" | "level" | "settings";

function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

/** Called from the action that rolled, not an effect, which `StrictMode` runs twice. */
function printTrace(run: Run) {
  if (import.meta.env.DEV && run.current !== null) console.log(formatTrace(run.current.trace));
}

/** Until saving (9.1), `?resume` in development starts a run and lands on Start with it in progress. */
const DEV_RESUME = import.meta.env.DEV && new URLSearchParams(window.location.search).has("resume");

function Game({ database }: { readonly database: Database }) {
  const engine = useMemo<Engine>(
    () => ({ data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS }),
    [database],
  );
  // Before a run; once one starts, the run holds its own
  const [settings, setSettings] = useState(() => defaultSettings(database));
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("General");
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [regions, setRegions] = useState<readonly string[]>(DEFAULT_REGIONS);
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [run, setRun] = useState<Run | null>(() => {
    if (!DEV_RESUME) return null;
    const result = startRun(engine, { stats, settings, regions, weaponShortlist: [], deadBosses: [] }, newSeed());
    return result.ok ? result.run : null;
  });
  const [view, setView] = useState<View>("start");
  // The run as it was before `Done` or `Felled?`, which `Undo` puts back
  const [undoTo, setUndoTo] = useState<Run | null>(null);
  const [reveal, setReveal] = useState<{ readonly kind: Reveal; readonly id: number }>({ kind: "none", id: 0 });
  const showCard = (kind: Reveal) => {
    setReveal((r) => ({ kind, id: r.id + 1 }));
    setView("card");
  };

  // Until the finished run's view (9.7) and Run history (9.10) take it, a finished run is dropped and Start is fresh
  const endRun = (_finished: Run) => {
    setRun(null);
    setUndoTo(null);
    setStats(DEFAULT_STATS);
    setRegions(DEFAULT_REGIONS);
    setSettings(defaultSettings(database));
    setProblems([]);
    setView("start");
  };
  const menu = (current: Run): RunMenuActions => ({
    title: runTitle(engine.data, current),
    onRunSettings: () => setView("settings"),
    onFinish: () => endRun(finishRun(current)),
  });
  // Home: the card while a run has an objective, `Level up` between objectives, Start otherwise
  const home = () => {
    if (run === null) setView("start");
    else if (run.current === null) setView("level");
    else showCard("none");
  };

  if (view === "rold") return <RoldCard onClose={() => setView("start")} />;

  if (view === "settings") {
    return (
      <RunSettings
        eyebrow={run === null ? "New run" : `Objective ${objectiveNumber(run)}`}
        settings={run?.settings ?? settings}
        characterClasses={database.character_class}
        tab={settingsTab}
        onTab={setSettingsTab}
        onClose={home}
        onSave={(next) => {
          if (run === null) {
            setSettings(next);
            setProblems([]);
          } else {
            setRun(editRun(run, { settings: next }));
          }
          home();
        }}
      />
    );
  }

  if ((view === "felled" || view === "rerolling") && run !== null && undoTo !== null) {
    const boss = undoTo.current === null ? undefined : engine.data.bosses.get(undoTo.current.boss);
    const noop = () => {};
    return (
      <Felled
        bossName={boss?.name ?? "unknown boss"}
        label={view === "felled" ? "Next objective in" : "Rerolling in"}
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
          setRun(undoTo);
          setUndoTo(null);
          showCard("none");
        }}
        onZero={() => {
          setUndoTo(null);
          // Every boss felled or skipped
          if (run.finished) {
            endRun(run);
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

  if (view === "level" && run !== null) {
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
            setRun(edited);
            showCard("none");
            return;
          }
          // With no living boss in the selected regions, the run stays here, waiting for more
          const next = rollNext(engine, edited);
          setRun(next);
          printTrace(next);
          if (next.current !== null) showCard("full");
        }}
      />
    );
  }

  if (view === "card" && run !== null) {
    return (
      <Card
        key={reveal.id}
        data={engine.data}
        run={run}
        reveal={reveal.kind}
        onReroll={(target) => {
          if (run.current === null) return;
          const next = reroll(engine, run, rerollTarget(run.current.slots, target));
          setRun(next);
          printTrace(next);
          // Only a full-objective reroll replays the reveal; any other keeps the card and swaps what changed
          if (target === "boss") showCard("quick");
        }}
        onDone={() => {
          setUndoTo(run);
          setRun(done(engine, run));
          setView("felled");
        }}
        onFelled={() => {
          const next = alreadyDead(engine, run);
          setUndoTo(run);
          setRun(next);
          printTrace(next);
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
        onOpenCard={() => setView("rold")}
        onResume={home}
        onNewRun={() => endRun(finishRun(run))}
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
      onOpenCard={() => setView("rold")}
      onRunSettings={() => setView("settings")}
      onStartRun={() => {
        const result = startRun(engine, { stats, settings, regions, weaponShortlist: [], deadBosses: [] }, newSeed());
        if (!result.ok) {
          setProblems(result.problems);
          return;
        }
        setProblems([]);
        setRun(result.run);
        printTrace(result.run);
        showCard("full");
      }}
    />
  );
}

export function App() {
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    loadDatabase()
      .then((database) => setState({ status: "ready", database }))
      .catch(() => setState({ status: "failed" }));
  }, []);

  return (
    <div className="app">
      {state.status === "ready" ? (
        <Game database={state.database} />
      ) : (
        <div className="app-waiting">
          {state.status === "loading" ? (
            <span className="app-loading" role="status" aria-label="Loading">
              <Lozenge size={28} />
            </span>
          ) : (
            <p>The game data could not be loaded.</p>
          )}
        </div>
      )}
    </div>
  );
}
