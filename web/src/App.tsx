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

  const current = run?.current ?? null;
  useEffect(() => {
    if (import.meta.env.DEV && current !== null) console.log(formatTrace(current.trace));
  }, [current]);

  if (view === "rold") return <RoldCard onClose={() => setView("start")} />;

  if (view === "card" && run !== null) {
    return (
      <Card
        key={reveal.id}
        data={engine.data}
        run={run}
        reveal={reveal.kind}
        // Stand-ins until the reroll panel (7.4) and the felled sequence with Level up (7.9)
        onReroll={() => {
          setRun(reroll(engine, run, "boss"));
          showCard("quick");
        }}
        onDone={() => {
          setRun(done(engine, run));
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
