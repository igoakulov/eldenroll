import { useState } from "react";

import { copy } from "../copy";
import type { BossInstance } from "../engine/database";
import type { BossState } from "../engine/run";
import { BottomBar, GlowBand } from "../ui/BottomBar";
import { Cycler } from "../ui/Cycler";
import { HeadingCount, ScreenHead, SectionHeading } from "../ui/Headings";
import { Screen } from "../ui/Screen";
import { SearchField, SearchMatch, SearchNone } from "../ui/SearchField";
import { ShowAll } from "../ui/ShowAll";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { bossSections, type BossBoard, type BossRow, type SectionKind } from "./bossList";
import "./Bosses.css";

export const BOSS_STATES = [
  { value: "alive", ...copy.bosses.states.alive },
  { value: "dead", ...copy.bosses.states.dead },
  { value: "skipped", ...copy.bosses.states.skipped },
] as const satisfies readonly {
  readonly value: BossState;
  readonly label: string;
  readonly lines: readonly string[];
}[];

const SEARCH_TITLES: Readonly<Record<SectionKind, string>> = copy.bosses.searchTitles;

function BossText({ row }: { readonly row: BossRow }) {
  return (
    <div className="boss-row-text">
      <p className="boss-row-name">
        <SearchMatch name={row.boss.name} match={row.match} />
      </p>
      <p className="boss-row-location">{row.boss.location}</p>
    </div>
  );
}

/** Every boss's state, before a run or during one. Changes stay here until `Save`; a changed row keeps its place
 * until the search changes. */
export function Bosses({
  eyebrow,
  bosses,
  board,
  onSave,
  onClose,
  defaultQuery = "",
  defaultExpanded = false,
}: {
  readonly eyebrow: string;
  /** Every boss instance that can roll, in database order. */
  readonly bosses: readonly BossInstance[];
  readonly board: BossBoard;
  /** Only the bosses whose state changed. */
  readonly onSave: (changes: ReadonlyMap<string, BossState>) => void;
  readonly onClose: () => void;
  /** What the search and the objectives' `Show all` open with, so the kit can show them; the app opens both empty
   * and folded. */
  readonly defaultQuery?: string;
  readonly defaultExpanded?: boolean;
}) {
  const [draft, setDraft] = useState(board.states);
  const [placed, setPlaced] = useState(board.states);
  const [query, setQuery] = useState(defaultQuery);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const searching = query.trim() !== "";
  const sections = bossSections(bosses, board, placed, query);

  const control = (row: BossRow) => {
    if (row.objective !== undefined) return null;
    if (row.boss.id === board.current) return <span className="boss-fixed">{copy.bosses.current}</span>;
    return (
      <Cycler
        label={row.boss.name}
        options={BOSS_STATES}
        value={draft.get(row.boss.id) ?? "alive"}
        onChange={(state) => setDraft(new Map(draft).set(row.boss.id, state))}
      />
    );
  };
  const rows = (list: readonly BossRow[], fadeIn = false) => (
    <div className={`boss-list${searching ? " boss-list-search" : ""}`}>
      {list.map((row) =>
        row.objective === undefined ? (
          <div key={row.boss.id} className="boss-row">
            <BossText row={row} />
            {control(row)}
          </div>
        ) : (
          <div key={row.boss.id} className={`boss-row boss-row-numbered${fadeIn ? " show-all-new" : ""}`}>
            <span className="boss-number">{row.objective}</span>
            <BossText row={row} />
          </div>
        ),
      )}
    </div>
  );

  return (
    <Screen
      className="bosses"
      bottom={
        <BottomBar>
          <GlowBand
            onClick={() =>
              onSave(
                new Map(
                  bosses
                    .map((boss) => [boss.id, draft.get(boss.id) ?? "alive"] as const)
                    .filter(([id, state]) => state !== (board.states.get(id) ?? "alive")),
                ),
              )
            }
          >
            {copy.common.save}
          </GlowBand>
        </BottomBar>
      }
    >
      <TopBar eyebrow={eyebrow}>
        <FramedIconButton icon="close" label={copy.common.closeWithoutSaving} onClick={onClose} />
      </TopBar>
      <ScreenHead title={copy.common.bosses} />
      <dl className="bosses-legend">
        {BOSS_STATES.map((state) => (
          <div key={state.value}>
            <dt>{state.label}</dt>
            <dd>
              {state.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <SearchField
        label={copy.bosses.search}
        value={query}
        onChange={(next) => {
          setQuery(next);
          setPlaced(draft);
        }}
      />

      {searching && sections.length === 0 && <SearchNone>{copy.bosses.notFound}</SearchNone>}
      {sections.map((section) => {
        if (searching) {
          return (
            <section key={section.kind}>
              <SectionHeading>{SEARCH_TITLES[section.kind]}</SectionHeading>
              {rows(section.rows)}
            </section>
          );
        }
        const count = <HeadingCount>{section.rows.length}</HeadingCount>;
        if (section.kind === "objectives") {
          return (
            <section key={section.kind}>
              <SectionHeading>{count} {copy.bosses.countedInObjectives}</SectionHeading>
              {expanded && rows(section.rows, true)}
              <ShowAll expanded={expanded} onToggle={() => setExpanded(!expanded)}>
                {expanded ? copy.bosses.showLess : copy.bosses.showAll(section.rows.length)}
              </ShowAll>
            </section>
          );
        }
        return (
          <section key={section.kind}>
            <SectionHeading>
              {count} {section.kind === "skipped" ? copy.bosses.countedSkipped : copy.bosses.countedOnTheWay}
            </SectionHeading>
            {rows(section.rows)}
          </section>
        );
      })}
    </Screen>
  );
}
