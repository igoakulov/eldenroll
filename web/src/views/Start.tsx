import type { Region } from "../engine/database";
import { derivedLevel, type Stats } from "../engine/settings";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SectionHeading } from "../ui/Headings";
import { LevelTotal } from "../ui/LevelTotal";
import { FramedRow, ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { RegionCheck, StatSteppers, byLevel } from "./StatsAndRegions";
import { Tagline } from "./Tagline";
import "./Start.css";

export const DISCLAIMER =
  "Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.";

function Wordmark() {
  return (
    <h1 className="wordmark" aria-label="EldenRoll">
      <span aria-hidden="true">ELDENR</span>
      <svg className="wordmark-o" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M10 1.6L18.4 12 10 22.4 1.6 12z" />
        <path d="M10 7.4L13.8 12 10 16.6 6.2 12z" fill="currentColor" stroke="none" />
      </svg>
      <span aria-hidden="true">LL</span>
    </h1>
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
  onStartRun,
}: {
  readonly regions: readonly Region[];
  readonly stats: Stats;
  readonly selectedRegions: readonly string[];
  readonly problems: readonly string[];
  readonly onStats: (stats: Stats) => void;
  readonly onRegions: (regions: readonly string[]) => void;
  readonly onOpenCard: () => void;
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

      <FramedRow title="Run settings" detail="Classes, never roll, shortlist, bosses" />

      <p className="legal">{DISCLAIMER}</p>
    </Screen>
  );
}

/** Start with a run in progress: stats, regions and settings belong to the run, so they stay hidden. */
export function StartResume({
  title,
  onOpenCard,
  onResume,
}: {
  readonly title: string;
  readonly onOpenCard: () => void;
  readonly onResume: () => void;
}) {
  return (
    <Screen
      mist="centre"
      bottom={
        <BottomBar>
          <RuledButton>New run</RuledButton>
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
