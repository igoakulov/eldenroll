import { useState } from "react";

import type { Region } from "../engine/database";
import type { Run } from "../engine/run";
import { derivedLevel, type Stats } from "../engine/settings";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SectionHeading } from "../ui/Headings";
import { WordmarkO } from "../ui/Icon";
import { LevelTotal } from "../ui/LevelTotal";
import { FramedRow, ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { NewRunConfirm } from "./RunMenu";
import { RegionCheck, StatSteppers, byLevel } from "./StatsAndRegions";
import { Tagline } from "./Tagline";
import "./Start.css";

export const DISCLAIMER =
  "Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.";

/** While the game data loads, only the lozenge shows, pulsing, in its place in the wordmark, so Start appears
 * around it without the page moving. */
function Wordmark({ loading = false }: { readonly loading?: boolean }) {
  const Tag = loading ? "p" : "h1";
  return (
    <Tag
      className={`wordmark${loading ? " wordmark-loading" : ""}`}
      role={loading ? "status" : undefined}
      aria-label={loading ? "Loading" : "EldenRoll"}
    >
      <span aria-hidden="true">ELDENR</span>
      <WordmarkO className="wordmark-o" />
      <span aria-hidden="true">LL</span>
    </Tag>
  );
}

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
            ? { notice: problems.map((problem) => <span key={problem}>{problem}.</span>) }
            : {})}
        >
          <GlowBand onClick={onStartRun}>Start run</GlowBand>
        </BottomBar>
      }
    >
      <Hero onOpenCard={onOpenCard} />

      <div>
        <LevelTotal level={derivedLevel(stats)} />
        <StatSteppers stats={stats} onStats={onStats} />

        <SectionHeading>Regions</SectionHeading>
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

      <FramedRow title="Run settings" detail="Classes, never roll, shortlist, bosses" onClick={onRunSettings} />

      <p className="legal">{DISCLAIMER}</p>
    </Screen>
  );
}

/** Start with a run in progress: stats, regions and settings belong to the run, so they stay hidden. */
export function StartResume({
  run,
  title,
  onOpenCard,
  onResume,
  onNewRun,
}: {
  readonly run: Run;
  readonly title: string;
  readonly onOpenCard: () => void;
  readonly onResume: () => void;
  readonly onNewRun: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Screen
      mist="centre"
      sheet={<NewRunConfirm open={confirming} run={run} onClose={() => setConfirming(false)} onConfirm={onNewRun} />}
      bottom={
        <BottomBar>
          <RuledButton onClick={() => setConfirming(true)}>New run</RuledButton>
          <GlowBand onClick={onResume}>Resume</GlowBand>
        </BottomBar>
      }
    >
      <Hero onOpenCard={onOpenCard} />
      <section className="in-run" aria-label="Run in progress">
        <SectionHeading>Current run</SectionHeading>
        <div className="in-run-rows">
          <ListRow title={title} detail="In progress" />
        </div>
      </section>
      <p className="legal legal-low">{DISCLAIMER}</p>
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
          <GlowBand onClick={onRetry}>Try again</GlowBand>
        </BottomBar>
      }
    >
      <header className="hero">
        <Wordmark />
      </header>
      <p className="start-failed" role="alert">
        The game data could not be loaded. Check your connection, then try again.
      </p>
      <p className="legal">{DISCLAIMER}</p>
    </Screen>
  );
}
