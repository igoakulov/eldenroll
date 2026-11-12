import type { ReactNode } from "react";

import type { Database } from "../engine/database";
import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { DEFAULT_REGIONS } from "../engine/regions";
import { alreadyDead, done, objectiveNumber, rollNext, startRun, type Engine, type Run } from "../engine/run";
import { DEFAULT_STATS, defaultSettings } from "../engine/settings";
import { boardBefore, boardOf, countState } from "../views/bossList";
import { Bosses } from "../views/Bosses";
import { Card, hasObjective, type RunWithObjective } from "../views/Card";
import { Felled } from "../views/Felled";
import { neverRollEntries, shortlistEntries } from "../views/gearList";
import { LevelUp } from "../views/LevelUp";
import { RoldCard } from "../views/RoldCard";
import { runTitle, type RunMenuActions } from "../views/RunMenu";
import { RunSettings, type SettingsTab } from "../views/RunSettings";
import { Start, StartFailed, StartLoading, StartResume } from "../views/Start";
import type { ViewName } from "./viewNames";

export interface KitView {
  readonly title: string;
  readonly render: () => ReactNode;
}

const noop = () => {};
const menu: RunMenuActions = { onHowItWorks: noop, onRunSettings: noop, onFinish: noop };

function withObjective(run: Run): RunWithObjective {
  if (!hasObjective(run)) throw new Error(`The kit's run at seed ${run.seed} has no objective`);
  return run;
}

/** Every view at a fixed seed, its state built through the engine as `App.tsx` builds it. */
export function kitViews(database: Database): Readonly<Record<ViewName, KitView>> {
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  const settings = defaultSettings(database);
  const start = (seed: number) => {
    const result = startRun(
      engine,
      { stats: DEFAULT_STATS, settings, regions: DEFAULT_REGIONS, weaponShortlist: [], deadBosses: [] },
      seed,
    );
    if (!result.ok) throw new Error(`The kit's run at seed ${seed} did not start: ${result.problems.join("; ")}`);
    return withObjective(result.run);
  };

  const first = start(1);
  const afterDone = done(engine, first);
  const toReroll = start(2);
  // Two objectives done, a boss felled on the way between them, the third current
  const progressed = withObjective(
    rollNext(engine, done(engine, alreadyDead(engine, rollNext(engine, done(engine, start(3)))))),
  );

  const rollableBosses = database.boss_instance.filter((boss) => boss.odds > 0);
  const gear = { neverRoll: neverRollEntries(database), shortlist: shortlistEntries(database) };
  const before = boardBefore([], []);
  const settingsOn = (tab: SettingsTab): KitView => ({
    title: `Run settings, ${tab}`,
    render: () => (
      <RunSettings
        eyebrow="New run"
        settings={settings}
        lists={{ neverRoll: [], weaponShortlist: [] }}
        gear={gear}
        characterClasses={database.character_class}
        tab={tab}
        onTab={noop}
        bossCounts={{ felled: countState(before, "dead"), skipped: countState(before, "skipped") }}
        bosses={() => null}
        onSave={noop}
        onClose={noop}
      />
    ),
  });
  const card = (run: RunWithObjective, withMenu: boolean) => (
    <Card
      data={engine.data}
      run={run}
      reveal="none"
      onReroll={noop}
      onDone={noop}
      onFelled={noop}
      onLevelUp={noop}
      {...(withMenu ? { menu } : {})}
    />
  );
  const felled = (undoTo: RunWithObjective, label: string) => (
    <Felled
      bossName={engine.data.bosses.get(undoTo.current.boss)?.name ?? "unknown boss"}
      label={label}
      behind={card(undoTo, false)}
      onZero={noop}
      onUndo={noop}
    />
  );

  return {
    start: {
      title: "Start",
      render: () => (
        <Start
          regions={database.region}
          stats={DEFAULT_STATS}
          selectedRegions={DEFAULT_REGIONS}
          problems={[]}
          onStats={noop}
          onRegions={noop}
          onOpenCard={noop}
          onRunSettings={noop}
          onStartRun={noop}
        />
      ),
    },
    "start-resume": {
      title: "Start, a run in progress",
      render: () => (
        <StartResume
          run={progressed}
          title={runTitle(engine.data, progressed)}
          onOpenCard={noop}
          onResume={noop}
          onNewRun={noop}
        />
      ),
    },
    "start-loading": { title: "Start, loading", render: () => <StartLoading /> },
    "start-failed": { title: "Start, failed", render: () => <StartFailed onRetry={noop} /> },
    "rold-card": { title: "Elden Rold card", render: () => <RoldCard onClose={noop} /> },
    "run-settings-general": settingsOn("General"),
    "run-settings-never-roll": settingsOn("Never roll"),
    "run-settings-shortlist": settingsOn("Shortlist"),
    bosses: {
      title: "Bosses",
      render: () => (
        <Bosses
          eyebrow={`Objective ${objectiveNumber(progressed)}`}
          bosses={rollableBosses}
          board={boardOf(progressed)}
          onSave={noop}
          onClose={noop}
        />
      ),
    },
    card: { title: "Card", render: () => card(first, true) },
    "felled-next": { title: "Great enemy felled, next objective", render: () => felled(first, "Next objective in") },
    "felled-rerolling": {
      title: "Great enemy felled, rerolling",
      // As after `Felled?`: the card behind is the run before the reroll
      render: () => felled(toReroll, "Rerolling in"),
    },
    "level-up-next": {
      title: "Level up, next objective",
      render: () => <LevelUp mode="next" run={afterDone} regions={database.region} onSave={noop} onClose={noop} menu={menu} />,
    },
    "level-up-mid": {
      title: "Level up, mid-objective",
      render: () => <LevelUp mode="mid" run={first} regions={database.region} onSave={noop} onClose={noop} />,
    },
  };
}
