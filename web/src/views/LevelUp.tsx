import { useState } from "react";

import type { Region } from "../engine/database";
import { WAITING_MESSAGES, objectiveNumber, type Run } from "../engine/run";
import { derivedLevel, type Stats } from "../engine/settings";
import { BottomBar, GlowBand } from "../ui/BottomBar";
import { ScreenHead, SectionHeading } from "../ui/Headings";
import { LevelTotal } from "../ui/LevelTotal";
import { Screen } from "../ui/Screen";
import { ShowAll } from "../ui/ShowAll";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { RunMenu, type RunMenuActions } from "./RunMenu";
import { RegionCheck, StatSteppers, byLevel } from "./StatsAndRegions";
import "./LevelUp.css";

const SHORT_LIST = 3;

export interface LevelUpChanges {
  readonly stats: Stats;
  readonly regions: readonly string[];
}

/** Stats and regions between objectives (`next`, ending in `Roll objective N`) or mid-objective (`mid`, ending in
 * `Save`). Edits stay here until then; `mid` closes without them. */
export function LevelUp({
  mode,
  run,
  regions,
  onSave,
  onClose,
  menu,
}: {
  readonly mode: "next" | "mid";
  readonly run: Run;
  readonly regions: readonly Region[];
  readonly onSave: (changes: LevelUpChanges) => void;
  readonly onClose: () => void;
  /** The menu, between objectives only. */
  readonly menu?: RunMenuActions;
}) {
  const [stats, setStats] = useState(run.stats);
  const [selected, setSelected] = useState(run.regions);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The next unticked regions as the screen opened; a ticked one stays in place rather than giving way
  const [next] = useState(() =>
    byLevel(regions)
      .filter((region) => !run.regions.includes(region.id))
      .slice(0, SHORT_LIST),
  );
  // A waiting message stands until the player edits, as Start's problems do; a failed roll brings it back
  const [editedAt, setEditedAt] = useState<Run | null>(null);

  // Marked against the stats at `Done`, so a failed roll, which saves the edits, keeps them marked
  const before = mode === "next" ? (run.completed.at(-1)?.stats ?? run.stats) : run.stats;
  const shown = expanded ? byLevel(regions) : next;
  const nextIds = new Set(next.map((region) => region.id));
  const notice = mode === "next" && run.waiting !== null && editedAt !== run ? WAITING_MESSAGES[run.waiting] : null;
  const eyebrow = mode === "next" ? `Objective ${run.completed.length} complete` : `Objective ${objectiveNumber(run)}`;

  return (
    <Screen
      className="level-up"
      sheet={
        mode === "next" && menu !== undefined ? (
          <RunMenu open={menuOpen} run={run} actions={menu} onClose={() => setMenuOpen(false)} />
        ) : null
      }
      bottom={
        <BottomBar {...(notice === null ? {} : { notice: `${notice}.` })}>
          <GlowBand onClick={() => onSave({ stats, regions: selected })}>
            {mode === "next" ? `Roll objective ${objectiveNumber(run)}` : "Save"}
          </GlowBand>
        </BottomBar>
      }
    >
      <TopBar eyebrow={eyebrow}>
        {mode === "next" ? (
          <FramedIconButton icon="menu" label="Menu" onClick={() => setMenuOpen(true)} />
        ) : (
          <FramedIconButton icon="close" label="Close without saving" onClick={onClose} />
        )}
      </TopBar>
      <ScreenHead title="Level up">
        <p className="screen-lede">
          {mode === "next"
            ? "Update your stats and regions before you roll next objective."
            : "Changes apply on the next roll."}
        </p>
      </ScreenHead>

      <LevelTotal level={derivedLevel(stats)} before={derivedLevel(before)} />
      <StatSteppers
        stats={stats}
        before={before}
        onStats={(edited) => {
          setStats(edited);
          setEditedAt(run);
        }}
      />

      <SectionHeading>Regions</SectionHeading>
      <p className="level-up-regions-sum">
        <span>
          {selected.length} of {regions.length} selected
        </span>
        {!expanded && next.length > 0 && <span className="level-up-regions-order">Next in order</span>}
      </p>
      <div className="level-up-regions">
        {shown.map((region) => (
          <RegionCheck
            key={region.id}
            region={region}
            regions={regions}
            selected={selected}
            onRegions={(edited) => {
              setSelected(edited);
              setEditedAt(run);
            }}
            {...(expanded && !nextIds.has(region.id) ? { className: "show-all-new" } : {})}
          />
        ))}
      </div>
      <ShowAll expanded={expanded} onToggle={() => setExpanded(!expanded)}>
        {expanded ? "Show fewer regions" : `Show all ${regions.length} regions`}
      </ShowAll>
    </Screen>
  );
}
