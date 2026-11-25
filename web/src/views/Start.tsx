import { useState } from "react";

import { copy } from "../copy";
import type { Region } from "../engine/database";
import type { Run } from "../engine/run";
import { derivedLevel, type Stats } from "../engine/settings";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SectionHeading } from "../ui/Headings";
import { LevelTotal } from "../ui/LevelTotal";
import { FramedRow, ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { Wordmark } from "../ui/Wordmark";
import { NewRunConfirm, runsDetail } from "./RunMenu";
import { RegionCheck, StatSteppers, byLevel } from "./StatsAndRegions";
import { Tagline } from "./Tagline";
import "./Start.css";


function Hero({ onOpenCard }: { readonly onOpenCard: () => void }) {
  return (
    <header className="hero">
      <Wordmark />
      <Tagline onOpen={onOpenCard} />
    </header>
  );
}

/** Start with no run in progress: everything that sets up the run, then `Start run`. */
export function Start({
  regions,
  stats,
  selectedRegions,
  problems,
  onStats,
  onRegions,
  onOpenCard,
  onRunSettings,
  onStartRun,
}: {
  readonly regions: readonly Region[];
  readonly stats: Stats;
  readonly selectedRegions: readonly string[];
  readonly problems: readonly string[];
  readonly onStats: (stats: Stats) => void;
  readonly onRegions: (regions: readonly string[]) => void;
  readonly onOpenCard: () => void;
  readonly onRunSettings: () => void;
  readonly onStartRun: () => void;
}) {
  return (
    <Screen
      mist="centre"
      bottom={
        <BottomBar
          {...(problems.length > 0
            ? { notice: problems.map((problem) => <span key={problem}>{problem}</span>) }
            : {})}
        >
          <GlowBand onClick={onStartRun}>{copy.start.startRun}</GlowBand>
        </BottomBar>
      }
    >
      <Hero onOpenCard={onOpenCard} />

      <div>
        <LevelTotal level={derivedLevel(stats)} />
        <StatSteppers stats={stats} onStats={onStats} />

        <SectionHeading>{copy.common.regions}</SectionHeading>
        <div>
          {byLevel(regions).map((region) => (
            <RegionCheck
              key={region.id}
              region={region}
              regions={regions}
              selected={selectedRegions}
              onRegions={onRegions}
            />
          ))}
        </div>
      </div>

      <FramedRow title={copy.common.runSettings} detail={copy.common.runSettingsDetail} onClick={onRunSettings} />

    </Screen>
  );
}

/** Start with a run in progress: stats, regions and settings belong to the run, so they stay hidden. */
export function StartResume({
  run,
  title,
  onOpenCard,
  onResume,
  finishedRuns,
  onRuns,
  onNewRun,
}: {
  readonly run: Run;
  readonly title: string;
  readonly onOpenCard: () => void;
  readonly onResume: () => void;
  readonly finishedRuns: number;
  readonly onRuns: () => void;
  readonly onNewRun: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Screen
      mist="centre"
      sheet={<NewRunConfirm open={confirming} run={run} onClose={() => setConfirming(false)} onConfirm={onNewRun} />}
      bottom={
        <BottomBar>
          <RuledButton onClick={() => setConfirming(true)}>{copy.common.newRun}</RuledButton>
          <GlowBand onClick={onResume}>{copy.start.resume}</GlowBand>
        </BottomBar>
      }
    >
      <Hero onOpenCard={onOpenCard} />
      {/* Every run first, as the menu orders them, then this one's way back to its objective */}
      <div className="in-run in-run-all">
        <ListRow title={copy.common.runs} detail={runsDetail(true, finishedRuns)} onClick={onRuns} />
      </div>
      <section className="in-run" aria-label={copy.start.runInProgress}>
        <SectionHeading>{copy.start.currentRun}</SectionHeading>
        <div className="in-run-rows">
          <ListRow title={title} detail={copy.start.inProgress} onClick={onResume} />
        </div>
      </section>
    </Screen>
  );
}

export function StartLoading() {
  return (
    <Screen mist="centre">
      <header className="hero">
        <Wordmark loading />
      </header>
    </Screen>
  );
}

/** The game data could not load: offline on a first visit, or the server failed. */
export function StartFailed({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <Screen
      mist="centre"
      bottom={
        <BottomBar>
          <GlowBand onClick={onRetry}>{copy.start.tryAgain}</GlowBand>
        </BottomBar>
      }
    >
      <header className="hero">
        <Wordmark />
      </header>
      <p className="start-failed" role="alert">
        {copy.start.loadFailed}
      </p>
    </Screen>
  );
}
