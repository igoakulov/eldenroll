import { useState, type ReactNode } from "react";

import { copy } from "../copy";
import type { CharacterClass } from "../engine/database";
import { MAX_STAT, correctedMaxStatGap, settingsProblems, type Settings } from "../engine/settings";
import { BottomBar, GlowBand } from "../ui/BottomBar";
import { ScreenHead, SectionHeading } from "../ui/Headings";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { Stepper } from "../ui/Stepper";
import { Tabs } from "../ui/Tabs";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import type { GearEntry } from "./gearList";
import { GearPicker } from "./GearPicker";
import { CHARACTER_CLASS_ICONS } from "./icons";
import "./RunSettings.css";

export const SETTINGS_TABS = ["general", "neverRoll", "shortlist"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** Run state rather than settings (`Settings`), edited on this screen all the same. */
export interface RunLists {
  readonly neverRoll: readonly string[];
  readonly weaponShortlist: readonly string[];
}

/** The settings before a run or for the next roll in one. Edits stay here until `Save`, which keeps every tab's; a
 * setting no roll could use, such as no class, holds `Save` back with the reason. `Bosses` opens over it and saves on
 * its own, so pending edits here survive it. */
export function RunSettings({
  eyebrow,
  settings,
  lists,
  characterClasses,
  gear,
  tab,
  onTab,
  bossCounts,
  bosses,
  onSave,
  onClose,
  defaultQuery = "",
}: {
  readonly eyebrow: string;
  readonly settings: Settings;
  readonly lists: RunLists;
  readonly characterClasses: readonly CharacterClass[];
  /** What each list can pick from, in card order. */
  readonly gear: { readonly neverRoll: readonly GearEntry[]; readonly shortlist: readonly GearEntry[] };
  readonly tab: SettingsTab;
  readonly onTab: (tab: SettingsTab) => void;
  readonly bossCounts: { readonly felled: number; readonly skipped: number };
  /** The `Bosses` screen, given the way back here. */
  readonly bosses: (back: () => void) => ReactNode;
  readonly onSave: (settings: Settings, lists: RunLists) => void;
  readonly onClose: () => void;
  /** What the open list's search opens with, so the kit can show one; the app opens it empty. */
  readonly defaultQuery?: string;
}) {
  const [draft, setDraft] = useState(settings);
  const [listsDraft, setListsDraft] = useState(lists);
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [bossesOpen, setBossesOpen] = useState(false);
  const edit = (changes: Partial<Settings>) => {
    setDraft({ ...draft, ...changes });
    setProblems([]);
  };

  if (bossesOpen) return bosses(() => setBossesOpen(false));

  return (
    <Screen
      bottom={
        <BottomBar
          {...(problems.length > 0
            ? { notice: problems.map((problem) => <span key={problem}>{problem}</span>) }
            : {})}
        >
          <GlowBand
            onClick={() => {
              const found = settingsProblems(draft);
              if (found.length > 0) setProblems(found);
              else onSave(draft, listsDraft);
            }}
          >
            {copy.common.save}
          </GlowBand>
        </BottomBar>
      }
    >
      <TopBar eyebrow={eyebrow}>
        <FramedIconButton icon="close" label={copy.common.closeWithoutSaving} onClick={onClose} />
      </TopBar>
      <ScreenHead title={copy.common.runSettings} lede={copy.common.changesApplyOnNextRoll} />

      <Tabs
        label={copy.common.runSettings}
        tabs={SETTINGS_TABS.map((one) => copy.runSettings.tabs[one])}
        selected={SETTINGS_TABS.indexOf(tab)}
        onSelect={(index) => onTab(SETTINGS_TABS[index] ?? "general")}
        panels={[
          <>
            <SectionHeading>{copy.runSettings.classes}</SectionHeading>
            <div>
              {characterClasses.map((row) => (
                <LozengeCheckbox
                  key={row.id}
                  checked={draft.characterClasses.includes(row.id)}
                  icons={(CHARACTER_CLASS_ICONS[row.id] ?? []).map((icon) => `${icon}-22`)}
                  onChange={(checked) =>
                    edit({
                      characterClasses: characterClasses
                        .filter((other) =>
                          other.id === row.id ? checked : draft.characterClasses.includes(other.id),
                        )
                        .map((other) => other.id),
                    })
                  }
                >
                  {row.name}
                </LozengeCheckbox>
              ))}
            </div>

            <SectionHeading>{copy.runSettings.gear}</SectionHeading>
            <div>
              <Stepper
                id="max-stat-gap"
                label={copy.runSettings.maxStatGap}
                detail={copy.runSettings.maxStatGapDetail}
                value={draft.maxStatGap}
                min={0}
                max={MAX_STAT}
                correct={correctedMaxStatGap}
                onChange={(maxStatGap) => edit({ maxStatGap })}
              />
            </div>

            <SectionHeading>{copy.common.bosses}</SectionHeading>
            <div className="run-settings-bosses">
              <ListRow
                title={copy.common.bosses}
                detail={copy.runSettings.bossCounts(bossCounts.felled, bossCounts.skipped)}
                onClick={() => setBossesOpen(true)}
              />
            </div>
          </>,
          <>
            <p className="run-settings-note">{copy.runSettings.neverRollNote}</p>
            <GearPicker
              key="never-roll"
              entries={gear.neverRoll}
              picked={listsDraft.neverRoll}
              onChange={(neverRoll) => setListsDraft({ ...listsDraft, neverRoll })}
              searchLabel={copy.runSettings.searchNeverRoll}
              notFound={copy.runSettings.neverRollNotFound}
              defaultQuery={defaultQuery}
            />
          </>,
          <>
            <LozengeCheckbox
              framed
              className="run-settings-shortlist-toggle"
              checked={draft.weaponShortlistEnabled}
              onChange={(weaponShortlistEnabled) => edit({ weaponShortlistEnabled })}
            >
              {copy.runSettings.shortlistEnabled}
            </LozengeCheckbox>
            <p className="run-settings-note">{copy.runSettings.shortlistNote}</p>
            <GearPicker
              key="shortlist"
              entries={gear.shortlist}
              picked={listsDraft.weaponShortlist}
              onChange={(weaponShortlist) => setListsDraft({ ...listsDraft, weaponShortlist })}
              searchLabel={copy.runSettings.searchShortlist}
              notFound={copy.runSettings.shortlistNotFound}
              defaultQuery={defaultQuery}
            />
          </>,
        ]}
      />
    </Screen>
  );
}
