import { useState } from "react";

import { copy } from "../copy";
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
  defaultExpanded = false,
}: {
  readonly mode: "next" | "mid";
  readonly run: Run;
  readonly regions: readonly Region[];
  readonly onSave: (changes: LevelUpChanges) => void;
  readonly onClose: () => void;
  /** The menu, between objectives only. */
  readonly menu?: RunMenuActions;
  /** Whether the regions open in full, so the kit can show them; the app opens the short list. */
  readonly defaultExpanded?: boolean;
}) {
  const [stats, setStats] = useState(run.stats);
  const [selected, setSelected] = useState(run.regions);
  const [expanded, setExpanded] = useState(defaultExpanded);
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
  const eyebrow =
    mode === "next" ? copy.levelUp.complete(run.completed.length) : copy.common.objective(objectiveNumber(run));

  return (
    <Screen
      className="level-up"
      sheet={
        mode === "next" && menu !== undefined ? (
          <RunMenu open={menuOpen} run={run} actions={menu} onClose={() => setMenuOpen(false)} />
        ) : null
      }
      bottom={
        <BottomBar {...(notice === null ? {} : { notice })}>
          <GlowBand onClick={() => onSave({ stats, regions: selected })}>
            {mode === "next" ? copy.levelUp.rollObjective(objectiveNumber(run)) : copy.common.save}
          </GlowBand>
        </BottomBar>
      }
    >
      <TopBar eyebrow={eyebrow}>
        {mode === "next" ? (
          <FramedIconButton icon="menu" label={copy.common.menu} onClick={() => setMenuOpen(true)} />
        ) : (
          <FramedIconButton icon="close" label={copy.common.closeWithoutSaving} onClick={onClose} />
        )}
      </TopBar>
      <ScreenHead
        title={copy.common.levelUp}
        lede={mode === "next" ? copy.levelUp.ledeNext : copy.common.changesApplyOnNextRoll}
      />

      <LevelTotal level={derivedLevel(stats)} before={derivedLevel(before)} />
      <StatSteppers
        stats={stats}
        before={before}
        onStats={(edited) => {
          setStats(edited);
          setEditedAt(run);
        }}
      />

      <SectionHeading>{copy.common.regions}</SectionHeading>
      <p className="level-up-regions-sum">
        <span>{copy.levelUp.regionsSelected(selected.length, regions.length)}</span>
        {!expanded && next.length > 0 && <span className="level-up-regions-order">{copy.levelUp.nextInOrder}</span>}
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
        {expanded ? copy.levelUp.showFewerRegions : copy.levelUp.showAllRegions(regions.length)}
      </ShowAll>
    </Screen>
  );
}
