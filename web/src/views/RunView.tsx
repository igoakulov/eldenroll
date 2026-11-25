import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { copy } from "../copy";
import { isNone, type LoadoutSlot } from "../engine/database";
import { displaySlots, type SlotDisplay } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import { objectiveNumber, type Run } from "../engine/run";
import { STATS, derivedLevel, type Stats } from "../engine/settings";
import type { Finished, FinishedObjective, RunRecord } from "../save/finished";
import { Confirm } from "../ui/Confirm";
import { CountUp } from "../ui/CountUp";
import { HeadingCount, ScreenHead, SectionHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { LevelTotal } from "../ui/LevelTotal";
import { ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { SearchField, SearchMatch, SearchNone } from "../ui/SearchField";
import { ShowAll } from "../ui/ShowAll";
import { StatGrid } from "../ui/StatGrid";
import { Tabs } from "../ui/Tabs";
import { Timeline, TimelineEntry, TimelineRow, TimelineStats, TimelineValue } from "../ui/Timeline";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { ARMOR_PIECE_ICONS, CHARACTER_CLASS_ICONS, EMPTY_SLOT_ICONS, iconKey } from "./icons";
import { STAT_NAMES } from "./StatsAndRegions";
import { GEAR_KINDS, nameFromId, summarize, type GearKind, type Summary } from "./summary";
import { bossName, className, gearPick, hitIn, holds, pickKeyOf, searchRun, timelineItems, type Pick, type TimelineItem } from "./timeline";
import "./RunView.css";

/** How many rows a list shows before `Show all`. */
const TOP_CLASSES = 3;
const TOP_REROLLED = 5;

export type RunViewTab = "summary" | "timeline";
const TABS: readonly RunViewTab[] = ["summary", "timeline"];

/** A list the summary opens over the view: a kind of unique gear, or the bosses skipped. */
export type RunViewList = { readonly kind: "gear"; readonly gear: GearKind } | { readonly kind: "skipped" };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The view's title and the line under it. The title holds the place the card's boss holds, so opening the summary
 * from the card moves nothing; what places the run goes under it. */
interface RunHeading {
  readonly title: string;
  readonly lede: string;
}

/** The run in progress: its current objective's boss, or the objective alone between objectives. The status under
 * it is enough: `Totals` just below counts the objectives. */
export function currentHeading(data: EngineData, run: Run): RunHeading {
  const title =
    run.current === null ? copy.common.objective(objectiveNumber(run)) : bossName(data, run.current.boss);
  return { title, lede: copy.runView.inProgress };
}

/** A finished run: the last boss it felled in an objective, never an objective's name, since nothing about that
 * objective opens. */
export function finishedHeading(data: EngineData, run: Finished): RunHeading {
  const last = run.objectives.at(-1);
  return {
    title: last === undefined ? copy.runView.objectives(run.objectives.length) : bossName(data, last.boss),
    lede: finishedOn(run.finishedAt),
  };
}

/** `Finished 10 Jan 2027`. */
export function finishedOn(finishedAt: string): string {
  return copy.runView.finishedOn(DATE.format(new Date(finishedAt)));
}

function ClassIcons({ id }: { readonly id: string }) {
  return (
    <span className="run-view-class-icons" aria-hidden="true">
      {(CHARACTER_CLASS_ICONS[id] ?? []).map((icon, index) => (
        <Icon key={index} name={`${icon}-22`} size={20} />
      ))}
    </span>
  );
}

/** What a slot holds as an open entry lists it, in gold when the search picked it. */
function Shown({
  display,
  pick,
  gone = null,
}: {
  readonly display: SlotDisplay;
  readonly pick: string | null;
  /** The name rebuilt from an id gone from the data, which shows in place of `none` (web/README.md#Saving). */
  readonly gone?: string | null;
}) {
  const matched = pick !== null && pickKeyOf(display) === pick;
  if (display.kind === "none" && gone !== null) return <TimelineValue>{gone}</TimelineValue>;
  // The rule `None` is an empty slot, as on the card
  if (display.kind === "rule" && isNone(display.rule.id))
    return <TimelineValue kind="none">{copy.controls.none}</TimelineValue>;
  switch (display.kind) {
    case "none":
      return <TimelineValue kind="none">{copy.controls.none}</TimelineValue>;
    case "any":
      return <TimelineValue kind="any">{copy.controls.any}</TimelineValue>;
    case "item":
      return <TimelineValue matched={matched}>{display.item.name}</TimelineValue>;
    case "alias":
      return <TimelineValue matched={matched}>{display.label}</TimelineValue>;
    case "rule":
      return <TimelineValue matched={matched}>{display.rule.name}</TimelineValue>;
    case "armor_set":
      return <TimelineValue matched={matched}>{display.set.name}</TimelineValue>;
  }
}

function iconOf(display: SlotDisplay, empty: string): string | null {
  return display.kind === "item" || display.kind === "alias" ? iconKey(display.item) : empty;
}

/** An open objective: its loadout in card order, the right hand first as in any list, then the level and stats at
 * `Done` (web/src/ui/README.md#Direction). */
function ObjectiveDetail({
  data,
  objective,
  pick,
}: {
  readonly data: EngineData;
  readonly objective: FinishedObjective;
  readonly pick: string | null;
}) {
  const shown = displaySlots(data, objective.slots);
  const card = copy.card;
  const gone = (slot: LoadoutSlot): string | null => {
    const id = objective.slots[slot];
    if (id === null || id === undefined || isNone(id)) return null;
    return data.items.has(id) || data.rules.has(id) || data.armorSets.has(id) ? null : nameFromId(id);
  };
  const hand = (label: string, slot: "rh" | "lh", held: SlotDisplay, ash: SlotDisplay, empty: string) => (
    <TimelineRow icon={iconOf(held, empty)} label={label}>
      <Shown display={held} pick={pick} gone={gone(slot)} />
      {(ash.kind === "item" || ash.kind === "alias") && (
        <TimelineValue kind="under" matched={pick !== null && pickKeyOf(ash) === pick}>
          {ash.kind === "item" ? ash.item.name : ash.label}
        </TimelineValue>
      )}
    </TimelineRow>
  );
  const armor = shown.armor;
  return (
    <>
      {hand(card.rightHand, "rh", shown.rh, shown.rh_ash, EMPTY_SLOT_ICONS.rh)}
      {hand(card.leftHand, "lh", shown.lh, shown.lh_ash, EMPTY_SLOT_ICONS.lh)}
      <TimelineRow icon={iconOf(shown.spell, EMPTY_SLOT_ICONS.spell)} label={card.spell}>
        <Shown display={shown.spell} pick={pick} gone={gone("spell")} />
      </TimelineRow>
      <TimelineRow icon={EMPTY_SLOT_ICONS.talisman} label={card.talismans}>
        <Shown display={shown.talisman_1} pick={pick} gone={gone("talisman_1")} />
        <Shown display={shown.talisman_2} pick={pick} gone={gone("talisman_2")} />
      </TimelineRow>
      <TimelineRow icon={ARMOR_PIECE_ICONS.body} label={card.armor}>
        <Shown display={armor} pick={pick} gone={gone("armor")} />
        {armor.kind === "armor_set" && (
          <TimelineValue kind="note">
            {Object.values(armor.pieces)
              // A `None` piece leaves its slot empty, as on the card
              .flatMap((piece) =>
                piece.kind === "item" ? [piece.item.name] : piece.kind === "alias" && !isNone(piece.item.id) ? [piece.label] : [],
              )
              .join(", ")}
          </TimelineValue>
        )}
      </TimelineRow>
      <TimelineRow icon={iconOf(shown.item, EMPTY_SLOT_ICONS.item)} label={card.item}>
        <Shown display={shown.item} pick={pick} gone={gone("item")} />
      </TimelineRow>
      <TimelineRow rule label={card.combatRule}>
        <Shown display={shown.rule} pick={pick} gone={gone("rule")} />
      </TimelineRow>
      <TimelineRow label={copy.runView.atDone}>
        <TimelineValue>{copy.runView.levelAt(derivedLevel(objective.stats))}</TimelineValue>
        <TimelineStats
          stats={STATS.map((stat) => ({ key: stat, label: copy.runView.statsShort[stat], value: objective.stats[stat] }))}
        />
      </TimelineRow>
    </>
  );
}

function SummaryTab({
  summary,
  stats,
  showAll,
  onShowAll,
  onList,
  onDelete,
}: {
  readonly summary: Summary;
  readonly stats: Stats;
  readonly showAll: ReadonlySet<string>;
  readonly onShowAll: (list: string) => void;
  readonly onList: (list: RunViewList) => void;
  /** A finished run's way to delete it, which asks first. */
  readonly onDelete?: () => void;
}) {
  const words = copy.runView;
  // The rows past the top fade in as one group when the list opens
  const shortened = <T,>(id: string, rows: readonly T[], top: number, row: (item: T) => ReactNode) => (
    <>
      <div className="run-view-rows">{rows.slice(0, top).map(row)}</div>
      {showAll.has(id) && <div className="run-view-rows run-view-more show-all-new">{rows.slice(top).map(row)}</div>}
      {rows.length > top && (
        <ShowAll expanded={showAll.has(id)} onToggle={() => onShowAll(id)}>
          {showAll.has(id) ? words.showLess : words.showAll(rows.length)}
        </ShowAll>
      )}
    </>
  );
  const gearCount = (kind: GearKind) => summary.gear[kind].length;
  return (
    <>
      <LevelTotal level={derivedLevel(stats)} />
      <StatGrid stats={STATS.map((stat) => ({ key: stat, label: STAT_NAMES[stat], value: stats[stat] }))} />

      <section>
        <SectionHeading>{words.totals}</SectionHeading>
        <div className="run-view-rows">
          <ListRow title={words.objectivesCompleted} count={<CountUp value={summary.objectives} />} />
          <ListRow title={words.bossesFelled} count={<CountUp value={summary.bossesFelled} />} />
          <ListRow
            title={words.bossesSkipped}
            count={<CountUp value={summary.skipped.length} />}
            {...(summary.skipped.length === 0 ? {} : { onClick: () => onList({ kind: "skipped" }) })}
          />
          <ListRow title={words.rerolls} count={<CountUp value={summary.rerolls} />} />
        </div>
      </section>

      {summary.topClasses.length > 0 && (
        <section>
          <SectionHeading>
            <HeadingCount>{summary.topClasses.length}</HeadingCount> {words.topClasses}
          </SectionHeading>
          {shortened("classes", summary.topClasses, TOP_CLASSES, (row) => (
            <ListRow
              key={row.id}
              title={
                <span className="run-view-class">
                  {row.name}
                  <ClassIcons id={row.id} />
                </span>
              }
              count={<CountUp value={row.count} />}
            />
          ))}
        </section>
      )}

      {summary.uniqueGear > 0 && (
        <section>
          <SectionHeading>
            <HeadingCount>{summary.uniqueGear}</HeadingCount> {words.uniqueGear}
          </SectionHeading>
          <div className="run-view-rows">
            {GEAR_KINDS.map((kind) => (
              <ListRow
                key={kind}
                title={words.gearKinds[kind].row}
                count={<CountUp value={gearCount(kind)} />}
                {...(gearCount(kind) === 0 ? {} : { onClick: () => onList({ kind: "gear", gear: kind }) })}
              />
            ))}
          </div>
        </section>
      )}

      {summary.mostRerolled.length > 0 && (
        <section>
          <SectionHeading>
            <HeadingCount>{summary.mostRerolled.length}</HeadingCount> {words.mostRerolled}
          </SectionHeading>
          {shortened("rerolled", summary.mostRerolled, TOP_REROLLED, (row) => (
            <ListRow
              key={row.id}
              title={row.name}
              {...(row.kind === null ? {} : { detail: words.rerolledKinds[row.kind] })}
              count={<CountUp value={row.count} />}
            />
          ))}
        </section>
      )}

      {onDelete !== undefined && (
        <div className="run-view-rows run-view-end">
          <ListRow title={copy.allRuns.deleteRun} detail={copy.allRuns.deleteRunDetail} danger onClick={onDelete} />
        </div>
      )}
    </>
  );
}

function TimelineTab({
  data,
  items,
  total,
  query,
  pick,
  open,
  onQuery,
  onPick,
  onToggle,
}: {
  readonly data: EngineData;
  readonly items: readonly TimelineItem[];
  readonly total: number;
  readonly query: string;
  readonly pick: Pick | null;
  readonly open: ReadonlySet<number>;
  readonly onQuery: (query: string) => void;
  readonly onPick: (pick: Pick) => void;
  readonly onToggle: (number: number) => void;
}) {
  const words = copy.runView;
  const searching = pick === null && query.trim() !== "";
  const sections = searching ? searchRun(data, items, query) : [];
  const shown = pick === null ? items : items.filter((item) => holds(data, item, pick.key));
  const found = shown.filter((item) => item.kind === "objective").length;

  const entry = (item: TimelineItem, index: number) => {
    if (item.kind === "felled")
      return (
        <TimelineEntry
          key={`felled-${index}`}
          eyebrow={words.felledOnTheWay}
          names={item.bosses.map((boss) => bossName(data, boss))}
        />
      );
    const hit = pick === null ? null : hitIn(data, item.objective, pick.key);
    return (
      <TimelineEntry
        key={item.number}
        eyebrow={copy.common.objective(item.number)}
        names={[bossName(data, item.objective.boss)]}
        line={className(data, item.objective.characterClass)}
        {...(hit === null || hit === undefined ? {} : { hit: { label: hit.label, value: hit.name } })}
        open={open.has(item.number)}
        onToggle={() => onToggle(item.number)}
      >
        <ObjectiveDetail data={data} objective={item.objective} pick={pick?.key ?? null} />
      </TimelineEntry>
    );
  };

  return (
    <>
      <SearchField label={words.search} value={query} onChange={onQuery} />
      {searching ? (
        sections.length === 0 ? (
          <SearchNone>{words.notFound}</SearchNone>
        ) : (
          sections.map((section) => (
            <section key={section.group}>
              <SectionHeading>{words.searchGroups[section.group]}</SectionHeading>
              <div className="run-view-rows">
                {section.picks.map((found) => (
                  <ListRow
                    key={found.key}
                    {...(found.group === "boss" || found.group === "character_class" ? {} : { icon: found.icon })}
                    title={<SearchMatch name={found.name} match={found.match} />}
                    opens="here"
                    found
                    onClick={() => onPick(found)}
                  />
                ))}
              </div>
            </section>
          ))
        )
      ) : (
        <>
          {pick !== null && <p className="run-view-found">{words.found(found, total)}</p>}
          <Timeline>{shown.map(entry)}</Timeline>
        </>
      )}
    </>
  );
}

/** One list the summary opens: a kind of unique gear, A–Z, each name finding it in the timeline; or the bosses
 * skipped, each name over its location, since one name can cover several places. */
function RunViewListScreen({
  data,
  eyebrow,
  summary,
  list,
  onPick,
  onClose,
}: {
  readonly data: EngineData;
  readonly eyebrow: string;
  readonly summary: Summary;
  readonly list: RunViewList;
  readonly onPick: (pick: Pick) => void;
  readonly onClose: () => void;
}) {
  const words = copy.runView;
  const top = (
    <TopBar eyebrow={eyebrow}>
      <FramedIconButton icon="close" label={copy.common.close} onClick={onClose} />
    </TopBar>
  );
  if (list.kind === "skipped")
    return (
      <Screen className="run-view">
        {top}
        <ScreenHead title={copy.common.bosses} />
        <SectionHeading>
          <HeadingCount>{summary.skipped.length}</HeadingCount> {words.skipped}
        </SectionHeading>
        <div className="run-view-rows">
          {summary.skipped.map((boss) => (
            <ListRow key={boss.id} title={boss.name} {...(boss.location === null ? {} : { detail: boss.location })} />
          ))}
        </div>
      </Screen>
    );
  const entries = summary.gear[list.gear];
  return (
    <Screen className="run-view">
      {top}
      <ScreenHead title={words.gearTitle} lede={words.gearLede} />
      <SectionHeading>
        <HeadingCount>{entries.length}</HeadingCount> {words.gearKinds[list.gear].counted}
      </SectionHeading>
      <div className="run-view-rows">
        {entries.map((entry) => {
          const pick = gearPick(data, list.gear, entry);
          return <ListRow key={entry.id} icon={pick.icon} title={entry.name} opens="search" onClick={() => onPick(pick)} />;
        })}
      </div>
    </Screen>
  );
}

/** The run's view, the same for the run in progress and a finished one, read-only (web/README.md#Run view). The
 * `default…` props set what it opens with, so the kit can show each state; the app opens it on `Summary` with
 * nothing open. */
export function RunView({
  data,
  eyebrow,
  heading,
  stats,
  record,
  onClose,
  onDelete,
  defaultTab = "summary",
  defaultDeleting = false,
  defaultList = null,
  defaultQuery = "",
  defaultPick = null,
  defaultOpen = [],
  defaultShowAll = [],
}: {
  readonly data: EngineData;
  readonly eyebrow: string;
  readonly heading: RunHeading;
  /** At the last `Done`, or the current ones for a run in progress. */
  readonly stats: Stats;
  readonly record: RunRecord;
  readonly onClose: () => void;
  /** A finished run's: deletes it once the player confirms. */
  readonly onDelete?: () => void;
  readonly defaultTab?: RunViewTab;
  /** The `Delete run` confirmation open, for the kit. */
  readonly defaultDeleting?: boolean;
  readonly defaultList?: RunViewList | null;
  readonly defaultQuery?: string;
  readonly defaultPick?: Pick | null;
  readonly defaultOpen?: readonly number[];
  readonly defaultShowAll?: readonly string[];
}) {
  const summary = useMemo(() => summarize(data, record), [data, record]);
  const items = useMemo(() => timelineItems(record), [record]);
  const [tab, setTab] = useState(TABS.indexOf(defaultTab));
  const [list, setList] = useState<RunViewList | null>(defaultList);
  const [query, setQuery] = useState(defaultPick?.name ?? defaultQuery);
  const [pick, setPick] = useState<Pick | null>(defaultPick);
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set(defaultOpen));
  const [showAll, setShowAll] = useState<ReadonlySet<string>>(new Set(defaultShowAll));
  const [deleting, setDeleting] = useState(defaultDeleting);
  const toggled = <T,>(set: ReadonlySet<T>, one: T) => {
    const next = new Set(set);
    if (!next.delete(one)) next.add(one);
    return next;
  };
  // Where a list was opened from, so closing it lands back there: the row keeps focus and the page its scroll
  const opener = useRef<{ readonly row: HTMLElement | null; readonly scroller: Element | null; readonly top: number } | null>(
    null,
  );
  const openList = (next: RunViewList) => {
    const row = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroller = row?.closest(".phone-frame-screen") ?? document.scrollingElement;
    opener.current = { row, scroller, top: scroller?.scrollTop ?? 0 };
    setList(next);
  };
  useLayoutEffect(() => {
    if (list !== null || opener.current === null) return;
    const { row, scroller, top } = opener.current;
    opener.current = null;
    if (scroller !== null) scroller.scrollTop = top;
    row?.focus({ preventScroll: true });
  }, [list]);
  const choose = (chosen: Pick) => {
    // A pick opens the timeline at its top, not the summary where the list was opened
    opener.current = null;
    setPick(chosen);
    setQuery(chosen.name);
    setOpen(new Set());
    setTab(TABS.indexOf("timeline"));
    setList(null);
  };

  // The summary stays mounted under a list, so its counts don't count again on the way back
  return (
    <>
      {list !== null && (
        <RunViewListScreen data={data} eyebrow={eyebrow} summary={summary} list={list} onPick={choose} onClose={() => setList(null)} />
      )}
      <Screen
        className={list === null ? "run-view" : "run-view run-view-hidden"}
        {...(onDelete === undefined
          ? {}
          : {
              sheet: (
                <Confirm
                  open={deleting}
                  title={copy.allRuns.deleteRun}
                  question={copy.allRuns.deleteQuestion}
                  parts={[{ text: copy.allRuns.cannotUndo, lost: true }]}
                  action={copy.allRuns.deleteRun}
                  onConfirm={onDelete}
                  onClose={() => setDeleting(false)}
                />
              ),
            })}
      >
        <TopBar eyebrow={eyebrow}>
          <FramedIconButton icon="close" label={copy.common.close} onClick={onClose} />
        </TopBar>
        <ScreenHead
          title={heading.title}
          lede={heading.lede}
        />
        <Tabs
          label={copy.runView.tabsLabel}
          tabs={TABS.map((one) => copy.runView.tabs[one])}
          selected={tab}
          onSelect={setTab}
          fit
          panels={[
            <SummaryTab
              key="summary"
              summary={summary}
              stats={stats}
              showAll={showAll}
              onShowAll={(id) => setShowAll(toggled(showAll, id))}
              onList={openList}
              {...(onDelete === undefined ? {} : { onDelete: () => setDeleting(true) })}
            />,
            <TimelineTab
              key="timeline"
              data={data}
              items={items}
              total={record.objectives.length}
              query={query}
              pick={pick}
              open={open}
              onQuery={(next) => {
                setQuery(next);
                setPick(null);
              }}
              onPick={choose}
              onToggle={(number) => setOpen(toggled(open, number))}
            />,
          ]}
        />
      </Screen>
    </>
  );
}
