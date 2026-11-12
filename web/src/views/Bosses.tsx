import { useState } from "react";

import type { BossInstance } from "../engine/database";
import type { BossState } from "../engine/run";
import { BottomBar, GlowBand } from "../ui/BottomBar";
import { Cycler } from "../ui/Cycler";
import { ScreenHead, SectionHeading } from "../ui/Headings";
import { Screen } from "../ui/Screen";
import { SearchField } from "../ui/SearchField";
import { ShowAll } from "../ui/ShowAll";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { bossSections, type BossBoard, type BossRow, type SectionKind } from "./bossList";
import "./Bosses.css";

const STATES = [
  { value: "alive", label: "Alive", lines: ["Can be rolled as an objective.", "Its gear cannot be rolled yet."] },
  { value: "dead", label: "Felled", lines: ["Felled in an objective or on the way.", "Its gear can be rolled."] },
  { value: "skipped", label: "Skipped", lines: ["Never rolled as an objective.", "Its gear cannot be rolled."] },
] as const satisfies readonly {
  readonly value: BossState;
  readonly label: string;
  readonly lines: readonly string[];
}[];

const SEARCH_TITLES: Readonly<Record<SectionKind, string>> = {
  alive: "Alive",
  skipped: "Skipped",
  dead: "Felled on the way",
  objectives: "Felled in objectives",
};

function Name({ row }: { readonly row: BossRow }) {
  const { name } = row.boss;
  if (row.match === undefined) return <p className="boss-row-name">{name}</p>;
  const [start, end] = row.match;
  return (
    <p className="boss-row-name">
      {name.slice(0, start)}
      <span className="boss-row-match">{name.slice(start, end)}</span>
      {name.slice(end)}
    </p>
  );
}

function BossText({ row }: { readonly row: BossRow }) {
  return (
    <div className="boss-row-text">
      <Name row={row} />
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
}: {
  readonly eyebrow: string;
  /** Every boss instance with `odds > 0`, in database order. */
  readonly bosses: readonly BossInstance[];
  readonly board: BossBoard;
  /** Only the bosses whose state changed. */
  readonly onSave: (changes: ReadonlyMap<string, BossState>) => void;
  readonly onClose: () => void;
}) {
  const [draft, setDraft] = useState(board.states);
  const [placed, setPlaced] = useState(board.states);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const searching = query.trim() !== "";
  const sections = bossSections(bosses, board, placed, query);

  const control = (row: BossRow) => {
    if (row.objective !== undefined) return null;
    if (row.boss.id === board.current) return <span className="boss-fixed">Current</span>;
    return (
      <Cycler
        label={row.boss.name}
        options={STATES}
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
            Save
          </GlowBand>
        </BottomBar>
      }
    >
      <TopBar eyebrow={eyebrow}>
        <FramedIconButton icon="close" label="Close without saving" onClick={onClose} />
      </TopBar>
      <ScreenHead title="Bosses" />
      <dl className="bosses-legend">
        {STATES.map((state) => (
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
        label="Search bosses"
        value={query}
        onChange={(next) => {
          setQuery(next);
          setPlaced(draft);
        }}
      />

      {searching && sections.length === 0 && <p className="bosses-none">No boss by that name.</p>}
      {sections.map((section) => {
        if (searching) {
          return (
            <section key={section.kind}>
              <SectionHeading>{SEARCH_TITLES[section.kind]}</SectionHeading>
              {rows(section.rows)}
            </section>
          );
        }
        const count = <span className="bosses-count">{section.rows.length}</span>;
        if (section.kind === "objectives") {
          return (
            <section key={section.kind}>
              <SectionHeading>{count} felled in objectives</SectionHeading>
              {expanded && rows(section.rows, true)}
              <ShowAll expanded={expanded} onToggle={() => setExpanded(!expanded)}>
                {expanded ? "Show less" : `Show all ${section.rows.length}`}
              </ShowAll>
            </section>
          );
        }
        return (
          <section key={section.kind}>
            <SectionHeading>
              {count} {section.kind === "skipped" ? "skipped" : "felled on the way"}
            </SectionHeading>
            {rows(section.rows)}
          </section>
        );
      })}
    </Screen>
  );
}
