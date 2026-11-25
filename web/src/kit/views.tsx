import type { ReactNode } from "react";

import { copy } from "../copy";
import { DEFAULT_REGIONS } from "../engine/regions";
import { objectiveNumber } from "../engine/run";
import { DEFAULT_STATS } from "../engine/settings";
import { boardBefore, boardOf, countState } from "../views/bossList";
import { AllRuns } from "../views/AllRuns";
import { Bosses } from "../views/Bosses";
import { Card, type RunWithObjective } from "../views/Card";
import { Felled } from "../views/Felled";
import { LevelUp } from "../views/LevelUp";
import { RerollPanel } from "../views/RerollPanel";
import { REROLL_STOPS } from "../views/rerollScope";
import { HowItWorks } from "../views/HowItWorks";
import { RunView, currentHeading, finishedHeading, type RunViewList, type RunViewTab } from "../views/RunView";
import { summarize } from "../views/summary";
import { gearPick, type Pick } from "../views/timeline";
import { recordOf } from "../save/finished";
import { FinishRunConfirm, NewRunConfirm, RunMenu, runTitle, type RunMenuActions } from "../views/RunMenu";
import { RunSettings, type SettingsTab } from "../views/RunSettings";
import { Start, StartFailed, StartLoading, StartResume } from "../views/Start";
import type { KitData } from "./kitData";
import type { ViewName } from "./viewNames";

export interface KitView {
  readonly title: string;
  readonly render: () => ReactNode;
  /** A sheet over the screen it opens from, shown under Groups rather than Views. */
  readonly sheet?: boolean;
  /** The part of a long screen the box opens at, as a CSS selector, when what the view shows lies below. */
  readonly scrollTo?: string;
}

const noop = () => {};

// Real queries that find rows in several groups, with the match inside names as well as at their start
const BOSS_QUERY = "dragon";
const GEAR_QUERY = "moon";
const REROLL_SCOPE = REROLL_STOPS.findIndex((stop) => stop.target === "talisman_1");

/** Every view at a fixed seed, and the sheets the views open only on a tap, each over its screen as the app draws
 * it: the sheet after the screen, in the same scrolling box, dimming it. */
export function kitViews(kit: KitData): Readonly<Record<ViewName, KitView>> {
  const { database, engine, settings, gear, runs } = kit;
  const menu: RunMenuActions = {
    // The kit's one finished run
    finishedRuns: 1,
    onRuns: noop,
    onSummary: noop,
    onHome: noop,
    onHowItWorks: noop,
    onRunSettings: noop,
    onFinish: noop,
  };
  const rollableBosses = database.boss_instance.filter((boss) => boss.odds > 0);
  const before = boardBefore([], []);
  const settingsOn = (tab: SettingsTab, query = ""): KitView => ({
    title: `Run settings, ${copy.runSettings.tabs[tab]}${query === "" ? "" : `, searching “${query}”`}`,
    render: () => (
      <RunSettings
        eyebrow={copy.common.newRun}
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
        defaultQuery={query}
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
  const longRecord = recordOf(runs.long);
  const longSummary = summarize(engine.data, longRecord);
  // The first weapon of the run, and the first letters of its first boss: real picks that find something
  const firstWeapon = longSummary.gear.weapons[0];
  const runPick: Pick | null = firstWeapon === undefined ? null : gearPick(engine.data, "weapons", firstWeapon);
  const runQuery = (engine.data.bosses.get(longRecord.objectives[0]?.boss ?? "")?.name ?? "").slice(0, 4).toLowerCase();
  const runView = (opening: {
    readonly tab?: RunViewTab;
    readonly list?: RunViewList;
    readonly query?: string;
    readonly pick?: Pick | null;
    readonly open?: readonly number[];
  }) => (
    <RunView
      data={engine.data}
      eyebrow={copy.runView.current}
      heading={currentHeading(engine.data, runs.long)}
      stats={runs.long.stats}
      record={longRecord}
      onClose={noop}
      {...(opening.tab === undefined ? {} : { defaultTab: opening.tab })}
      {...(opening.list === undefined ? {} : { defaultList: opening.list })}
      {...(opening.query === undefined ? {} : { defaultQuery: opening.query })}
      {...(opening.pick === undefined ? {} : { defaultPick: opening.pick })}
      {...(opening.open === undefined ? {} : { defaultOpen: opening.open })}
    />
  );
  const felled = (undoTo: RunWithObjective, label: string) => (
    <Felled
      bossName={engine.data.bosses.get(undoTo.current.boss)?.name ?? copy.common.unknownBoss}
      label={label}
      behind={card(undoTo, false)}
      onZero={noop}
      onUndo={noop}
    />
  );
  const bosses = (extra: { readonly defaultQuery?: string; readonly defaultExpanded?: boolean }) => (
    <Bosses
      eyebrow={copy.common.objective(objectiveNumber(runs.progressed))}
      bosses={rollableBosses}
      board={boardOf(runs.progressed)}
      onSave={noop}
      onClose={noop}
      {...extra}
    />
  );
  const rerollPanel = (felledOnTheWay: boolean) => (
    <RerollPanel
      open
      felled={felledOnTheWay}
      onClose={noop}
      onReroll={noop}
      onFelled={noop}
      opening={REROLL_SCOPE}
    />
  );
  const startResume = () => (
    <StartResume
      run={runs.progressed}
      title={runTitle(engine.data, runs.progressed)}
      onOpenCard={noop}
      onResume={noop}
      finishedRuns={1}
      onRuns={noop}
      onNewRun={noop}
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
          finishedRuns={1}
          onRuns={noop}
        />
      ),
    },
    "start-resume": { title: "Start, a run in progress", render: startResume },
    "start-loading": { title: "Start, loading", render: () => <StartLoading /> },
    "start-failed": { title: "Start, failed", render: () => <StartFailed onRetry={noop} /> },
    "how-it-works": { title: "How it works", render: () => <HowItWorks onClose={noop} onHome={noop} /> },
    "run-settings-general": settingsOn("general"),
    "run-settings-never-roll": settingsOn("neverRoll"),
    "run-settings-never-roll-search": settingsOn("neverRoll", GEAR_QUERY),
    "run-settings-shortlist": settingsOn("shortlist"),
    bosses: { title: "Bosses", render: () => bosses({}) },
    "bosses-search": { title: `Bosses, searching “${BOSS_QUERY}”`, render: () => bosses({ defaultQuery: BOSS_QUERY }) },
    "bosses-all": { title: "Bosses, objectives shown in full", render: () => bosses({ defaultExpanded: true }) },
    card: { title: "Card", render: () => card(runs.first, true) },
    "felled-next": {
      title: "Great enemy felled, next objective",
      render: () => felled(runs.first, copy.felled.nextObjectiveIn),
    },
    "felled-rerolling": {
      title: "Great enemy felled, rerolling",
      // As after `Felled?`: the card behind is the run before the reroll
      render: () => felled(runs.toReroll, copy.felled.rerollingIn),
    },
    "level-up-next": {
      title: "Level up, next objective",
      render: () => (
        <LevelUp mode="next" run={runs.afterDone} regions={database.region} onSave={noop} onClose={noop} menu={menu} />
      ),
    },
    "level-up-all-regions": {
      title: "Level up, regions shown in full",
      scrollTo: ".level-up-regions-sum",
      render: () => (
        <LevelUp
          mode="next"
          run={runs.afterDone}
          regions={database.region}
          onSave={noop}
          onClose={noop}
          menu={menu}
          defaultExpanded
        />
      ),
    },
    "level-up-waiting": {
      title: "Level up, waiting for a region",
      render: () => (
        <LevelUp mode="next" run={runs.waiting} regions={database.region} onSave={noop} onClose={noop} menu={menu} />
      ),
    },
    "level-up-mid": {
      title: "Level up, mid-objective",
      render: () => <LevelUp mode="mid" run={runs.first} regions={database.region} onSave={noop} onClose={noop} />,
    },
    "card-menu": {
      title: "Menu",
      sheet: true,
      render: () => (
        <>
          {card(runs.first, true)}
          <RunMenu open run={runs.first} actions={menu} onClose={noop} />
        </>
      ),
    },
    "card-reroll": {
      title: "Reroll panel, a scope chosen",
      sheet: true,
      render: () => (
        <>
          {card(runs.first, true)}
          {rerollPanel(false)}
        </>
      ),
    },
    "card-felled": {
      title: "Felled?",
      sheet: true,
      render: () => (
        <>
          {card(runs.first, true)}
          {rerollPanel(true)}
        </>
      ),
    },
    "card-finish-run": {
      title: "Finish run",
      sheet: true,
      render: () => (
        <>
          {card(runs.progressed, true)}
          <FinishRunConfirm open run={runs.progressed} onClose={noop} onConfirm={noop} />
        </>
      ),
    },
    "run-view": {
      title: "Current run's view, Summary",
      render: () => runView({}),
    },
    "run-view-timeline": {
      title: "Current run's view, Timeline, one objective open",
      render: () => runView({ tab: "timeline", open: [2] }),
    },
    "run-view-search": {
      title: `Current run's view, Timeline, searching “${runQuery}”`,
      render: () => runView({ tab: "timeline", query: runQuery }),
    },
    "run-view-found": {
      title: "Current run's view, Timeline, a weapon picked",
      render: () => runView({ tab: "timeline", pick: runPick }),
    },
    "run-view-gear": {
      title: "Unique gear, weapons",
      render: () => runView({ list: { kind: "gear", gear: "weapons" } }),
    },
    "run-view-skipped": {
      title: "Bosses skipped",
      render: () => runView({ list: { kind: "skipped" } }),
    },
    "run-view-finished": {
      title: "Finished run's view, Summary shown in full",
      render: () => {
        const last = runs.finished.objectives.at(-1);
        return (
          <RunView
            data={engine.data}
            eyebrow={copy.runView.finished}
            heading={finishedHeading(engine.data, runs.finished)}
            stats={last?.stats ?? DEFAULT_STATS}
            record={runs.finished}
            onClose={noop}
            onDelete={noop}
            defaultShowAll={["classes", "rerolled"]}
          />
        );
      },
    },
    "all-runs": {
      title: "All runs, a run in progress",
      render: () => (
        <AllRuns data={engine.data} run={runs.long} finished={[runs.finished]} onResume={noop} onOpen={noop} onClose={noop} />
      ),
    },
    "run-view-delete": {
      title: "Delete run",
      sheet: true,
      scrollTo: ".run-view-end",
      render: () => (
        <RunView
          data={engine.data}
          eyebrow={copy.runView.finished}
          heading={finishedHeading(engine.data, runs.finished)}
          stats={runs.finished.objectives.at(-1)?.stats ?? DEFAULT_STATS}
          record={runs.finished}
          onClose={noop}
          onDelete={noop}
          defaultDeleting
        />
      ),
    },
    "start-resume-new-run": {
      title: "New run",
      sheet: true,
      render: () => (
        <>
          {startResume()}
          <NewRunConfirm open run={runs.progressed} onClose={noop} onConfirm={noop} />
        </>
      ),
    },
  };
}
