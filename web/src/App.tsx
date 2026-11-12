import { useEffect, useMemo, useState } from "react";

import type { Database } from "./engine/database";
import { indexDatabase } from "./engine/engineData";
import { DEFAULT_HYPERPARAMS } from "./engine/hyperparams";
import { DEFAULT_REGIONS } from "./engine/regions";
import { done, objectiveNumber, reroll, startRun, type Engine, type Run } from "./engine/run";
import { DEFAULT_STATS, defaultSettings, type Stats } from "./engine/settings";
import { formatTrace } from "./engine/trace";
import { loadDatabase } from "./loadDatabase";
import { Lozenge } from "./ui/Icon";
import { Card, type Reveal } from "./views/Card";
import { rerollTarget } from "./views/rerollScope";
import { RoldCard } from "./views/RoldCard";
import { Start, StartResume } from "./views/Start";
import "./App.css";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed" };

type View = "start" | "card" | "rold";

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
  const [reveal, setReveal] = useState<{ readonly kind: Reveal; readonly id: number }>({ kind: "none", id: 0 });
  const showCard = (kind: Reveal) => {
    setReveal((r) => ({ kind, id: r.id + 1 }));
    setView("card");
  };

  if (view === "rold") return <RoldCard onClose={() => setView("start")} />;

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
        // A stand-in until the felled sequence with Level up (7.9)
        onDone={() => {
          const next = done(engine, run);
          setRun(next);
          printTrace(next);
          showCard("full");
        }}
      />
    );
  }

  if (run !== null) {
    const boss = run.current === null ? undefined : engine.data.bosses.get(run.current.boss);
    return (
      <StartResume
        title={`Objective ${objectiveNumber(run)}${boss === undefined ? "" : `, ${boss.name}`}`}
        onOpenCard={() => setView("rold")}
        onResume={() => showCard("none")}
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
