import type { ReactNode } from "react";

import { DEFAULT_REGIONS } from "../engine/regions";
import { objectiveNumber } from "../engine/run";
import { DEFAULT_STATS } from "../engine/settings";
import { boardBefore, boardOf, countState } from "../views/bossList";
import { Bosses } from "../views/Bosses";
import { Card, type RunWithObjective } from "../views/Card";
import { Felled } from "../views/Felled";
import { LevelUp } from "../views/LevelUp";
import { RerollPanel } from "../views/RerollPanel";
import { REROLL_STOPS } from "../views/rerollScope";
import { RoldCard } from "../views/RoldCard";
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
const menu: RunMenuActions = { onHowItWorks: noop, onRunSettings: noop, onFinish: noop };

// Real queries that find rows in several groups, with the match inside names as well as at their start
const BOSS_QUERY = "dragon";
const GEAR_QUERY = "moon";
const REROLL_SCOPE = REROLL_STOPS.findIndex((stop) => stop.target === "talisman_1");

/** Every view at a fixed seed, and the sheets the views open only on a tap, each over its screen as the app draws
 * it: the sheet after the screen, in the same scrolling box, dimming it. */
export function kitViews(kit: KitData): Readonly<Record<ViewName, KitView>> {
  const { database, engine, settings, gear, runs } = kit;
  const rollableBosses = database.boss_instance.filter((boss) => boss.odds > 0);
  const before = boardBefore([], []);
  const settingsOn = (tab: SettingsTab, query = ""): KitView => ({
    title: `Run settings, ${tab}${query === "" ? "" : `, searching “${query}”`}`,
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
  const felled = (undoTo: RunWithObjective, label: string) => (
    <Felled
      bossName={engine.data.bosses.get(undoTo.current.boss)?.name ?? "unknown boss"}
      label={label}
      behind={card(undoTo, false)}
      onZero={noop}
      onUndo={noop}
    />
  );
  const bosses = (extra: { readonly defaultQuery?: string; readonly defaultExpanded?: boolean }) => (
    <Bosses
      eyebrow={`Objective ${objectiveNumber(runs.progressed)}`}
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
        />
      ),
    },
    "start-resume": { title: "Start, a run in progress", render: startResume },
    "start-loading": { title: "Start, loading", render: () => <StartLoading /> },
    "start-failed": { title: "Start, failed", render: () => <StartFailed onRetry={noop} /> },
    "rold-card": { title: "Elden Rold card", render: () => <RoldCard onClose={noop} /> },
    "run-settings-general": settingsOn("General"),
    "run-settings-never-roll": settingsOn("Never roll"),
    "run-settings-never-roll-search": settingsOn("Never roll", GEAR_QUERY),
    "run-settings-shortlist": settingsOn("Shortlist"),
    bosses: { title: "Bosses", render: () => bosses({}) },
    "bosses-search": { title: `Bosses, searching “${BOSS_QUERY}”`, render: () => bosses({ defaultQuery: BOSS_QUERY }) },
    "bosses-all": { title: "Bosses, objectives shown in full", render: () => bosses({ defaultExpanded: true }) },
    card: { title: "Card", render: () => card(runs.first, true) },
    "felled-next": {
      title: "Great enemy felled, next objective",
      render: () => felled(runs.first, "Next objective in"),
    },
    "felled-rerolling": {
      title: "Great enemy felled, rerolling",
      // As after `Felled?`: the card behind is the run before the reroll
      render: () => felled(runs.toReroll, "Rerolling in"),
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
