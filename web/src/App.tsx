import { useEffect, useMemo, useState } from "react";

import type { Database } from "./engine/database";
import { indexDatabase } from "./engine/engineData";
import { DEFAULT_HYPERPARAMS } from "./engine/hyperparams";
import { DEFAULT_REGIONS } from "./engine/regions";
import { done, editRun, objectiveNumber, reroll, rollNext, startRun, type Engine, type Run } from "./engine/run";
import { DEFAULT_STATS, defaultSettings, type Stats } from "./engine/settings";
import { formatTrace } from "./engine/trace";
import { loadDatabase } from "./loadDatabase";
import { Lozenge } from "./ui/Icon";
import { Card, type Reveal } from "./views/Card";
import { Felled } from "./views/Felled";
import { LevelUp } from "./views/LevelUp";
import { rerollTarget } from "./views/rerollScope";
import { RoldCard } from "./views/RoldCard";
import { Start, StartResume } from "./views/Start";
import "./App.css";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed" };

type View = "start" | "card" | "rold" | "felled" | "level";

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
  const settings = useMemo(() => defaultSettings(database), [database]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [regions, setRegions] = useState<readonly string[]>(DEFAULT_REGIONS);
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [run, setRun] = useState<Run | null>(() => {
    if (!DEV_RESUME) return null;
    const result = startRun(engine, { stats, settings, regions, weaponShortlist: [], deadBosses: [] }, newSeed());
    return result.ok ? result.run : null;
  });
  const [view, setView] = useState<View>("start");
  // The run as it was before `Done`, which `Undo` puts back
  const [undoTo, setUndoTo] = useState<Run | null>(null);
  const [reveal, setReveal] = useState<{ readonly kind: Reveal; readonly id: number }>({ kind: "none", id: 0 });
  const showCard = (kind: Reveal) => {
    setReveal((r) => ({ kind, id: r.id + 1 }));
    setView("card");
  };

  if (view === "rold") return <RoldCard onClose={() => setView("start")} />;

  if (view === "felled" && run !== null && undoTo !== null) {
    const boss = undoTo.current === null ? undefined : engine.data.bosses.get(undoTo.current.boss);
    const noop = () => {};
    return (
      <Felled
        bossName={boss?.name ?? "unknown boss"}
        label="Next objective in"
        behind={<Card data={engine.data} run={undoTo} reveal="none" onReroll={noop} onDone={noop} onLevelUp={noop} />}
        onUndo={() => {
          setRun(undoTo);
          setUndoTo(null);
          showCard("none");
        }}
        onZero={() => {
          setUndoTo(null);
          // Every boss felled or skipped: until the run's summary (9), the run ends on Start
          if (run.finished) {
            setRun(null);
            setView("start");
          } else {
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
        onLevelUp={() => setView("level")}
      />
    );
  }

  if (run !== null) {
    const boss = run.current === null ? undefined : engine.data.bosses.get(run.current.boss);
    return (
      <StartResume
        title={`Objective ${objectiveNumber(run)}${boss === undefined ? "" : `, ${boss.name}`}`}
        onOpenCard={() => setView("rold")}
        onResume={() => (run.current === null ? setView("level") : showCard("none"))}
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
