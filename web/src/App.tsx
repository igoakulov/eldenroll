import { useEffect, useMemo, useState } from "react";

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
import { PhoneFrame } from "./ui/PhoneFrame";
import { boardBefore, boardOf, countState, inState } from "./views/bossList";
import { Bosses } from "./views/Bosses";
import { Card, hasObjective, type Reveal } from "./views/Card";
import { Felled } from "./views/Felled";
import { neverRollEntries, shortlistEntries } from "./views/gearList";
import { LevelUp } from "./views/LevelUp";
import { rerollTarget } from "./views/rerollScope";
import { RoldCard } from "./views/RoldCard";
import { runTitle, type RunMenuActions } from "./views/RunMenu";
import { RunSettings, type RunLists, type SettingsTab } from "./views/RunSettings";
import { Start, StartFailed, StartLoading, StartResume } from "./views/Start";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed" };

type View = "start" | "card" | "rold" | "felled" | "rerolling" | "level" | "settings";

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
  const rollableBosses = useMemo(() => database.boss_instance.filter((boss) => boss.odds > 0), [database]);
  const gear = useMemo(
    () => ({ neverRoll: neverRollEntries(database), shortlist: shortlistEntries(database) }),
    [database],
  );
  // Before a run; once one starts, the run holds its own
  const [settings, setSettings] = useState(() => defaultSettings(database));
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [regions, setRegions] = useState<readonly string[]>(DEFAULT_REGIONS);
  const [deadBosses, setDeadBosses] = useState<readonly string[]>([]);
  const [skippedBosses, setSkippedBosses] = useState<readonly string[]>([]);
  const [lists, setLists] = useState<RunLists>({ neverRoll: [], weaponShortlist: [] });
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [run, setRun] = useState<Run | null>(() => {
    if (!DEV_RESUME) return null;
    const result = startRun(engine, { stats, settings, regions, weaponShortlist: [], deadBosses: [] }, newSeed());
    return result.ok ? result.run : null;
  });
  const [view, setView] = useState<View>("start");
  // The Elden Rold card closes back to where it opened: Start, or the screen whose menu opened it
  const [roldFromMenu, setRoldFromMenu] = useState(false);
  // The run as it was before `Done` or `Felled?`, which `Undo` puts back
  const [undoTo, setUndoTo] = useState<Run | null>(null);
  const [reveal, setReveal] = useState<{ readonly kind: Reveal; readonly id: number }>({ kind: "none", id: 0 });
  const showCard = (kind: Reveal) => {
    setReveal((r) => ({ kind, id: r.id + 1 }));
    setView("card");
  };

  // Until the finished run's view (9.7) and Past runs (9.9) take it, a finished run is dropped and Start is fresh
  const endRun = (_finished: Run) => {
    setRun(null);
    setUndoTo(null);
    setStats(DEFAULT_STATS);
    setRegions(DEFAULT_REGIONS);
    setSettings(defaultSettings(database));
    setDeadBosses([]);
    setSkippedBosses([]);
    setLists({ neverRoll: [], weaponShortlist: [] });
    setProblems([]);
    setView("start");
  };
  const menu = (current: Run): RunMenuActions => ({
    onHome: () => setView("start"),
    onHowItWorks: () => {
      setRoldFromMenu(true);
      setView("rold");
    },
    onRunSettings: () => setView("settings"),
    onFinish: () => endRun(finishRun(current)),
  });
  // Home: the card while a run has an objective, `Level up` between objectives, Start otherwise
  const home = () => {
    if (run === null) setView("start");
    else if (run.current === null) setView("level");
    else showCard("none");
  };

  if (view === "rold")
    return <RoldCard onClose={() => (roldFromMenu ? home() : setView("start"))} onHome={() => setView("start")} />;

  if (view === "settings") {
    const eyebrow = run === null ? copy.common.newRun : copy.common.objective(objectiveNumber(run));
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
                setRun(next);
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
            setRun(
              editRun(run, {
                settings: next,
                neverRoll: nextLists.neverRoll,
                weaponShortlist: nextLists.weaponShortlist,
              }),
            );
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
            setRun(edited);
            showCard("none");
            return;
          }
          // With no living boss in the selected regions, the run stays here, waiting for more
          const next = rollNext(engine, edited);
          setRun(next);
          if (next.current !== null) showCard("full");
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
          setRun(next);
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
        onOpenCard={() => {
          setRoldFromMenu(false);
          setView("rold");
        }}
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
      onOpenCard={() => {
        setRoldFromMenu(false);
        setView("rold");
      }}
      onRunSettings={() => setView("settings")}
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
        setRun(result.run);
        showCard("full");
      }}
    />
  );
}

export function App() {
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    loadDatabase()
      .then((database) => {
        if (current) setState({ status: "ready", database });
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
        <Game database={state.database} />
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
