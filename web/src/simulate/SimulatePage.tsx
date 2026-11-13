import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { sampleOf } from "../../sim/aggregate";
import { ALLOCATIONS, type Allocation } from "../../sim/player";
import { playOrder, type ChanceSums, type RunResult } from "../../sim/simulate";
import { copy } from "../copy";
import type { Database } from "../engine/database";
import { indexDatabase, type EngineData } from "../engine/engineData";
import { loadDatabase } from "../loadDatabase";
import { BottomBar, GlowBand } from "../ui/BottomBar";
import { ChipButton, Chips } from "../ui/Chips";
import { Cycler } from "../ui/Cycler";
import { HeadingAction, HeadingCount, ScreenHead, SectionHeading } from "../ui/Headings";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { SearchField } from "../ui/SearchField";
import { Stepper } from "../ui/Stepper";
import { StopSlider } from "../ui/StopSlider";
import { Tabs } from "../ui/Tabs";
import { useHideOnScroll } from "../ui/useHideOnScroll";
import { Boosts } from "./Boosts";
import { Decay } from "./Decay";
import { Gear } from "./Gear";
import {
  COMPLETION_STEP,
  MAX_RUNS,
  MAX_SEED,
  TABS,
  randomSeed,
  readAddress,
  sameInputs,
  writeAddress,
  type Inputs,
  type View,
} from "./inputs";
import { DLC_PREFIX } from "../views/StatsAndRegions";
import { Overview } from "./Overview";
import type { Reply, Request } from "./simulate.worker";
import "./SimulatePage.css";

const words = copy.simulate;

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database; readonly data: EngineData }
  | { readonly status: "failed"; readonly message: string };

type Simulation =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly id: number; readonly inputs: Inputs; readonly done: number }
  | { readonly status: "failed"; readonly message: string };

/** What typed into a stepper becomes: a whole number in range, or the last value. */
const corrector = (min: number, max: number) => (entered: string, previous: number) => {
  const value = Number.parseInt(entered, 10);
  return Number.isNaN(value) ? previous : Math.min(max, Math.max(min, value));
};

export function SimulatePage() {
  const initial = useMemo(() => readAddress(window.location.search), []);
  const [inputs, setInputs] = useState<Inputs>(initial.inputs);
  const [view, setView] = useState<View>(initial.view);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [simulation, setSimulation] = useState<Simulation>({ status: "idle" });
  const [results, setResults] = useState<{
    readonly inputs: Inputs;
    readonly runs: readonly RunResult[];
    readonly chances: ChanceSums;
  } | null>(null);
  const worker = useRef<Worker | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    loadDatabase().then(
      (database) => setLoaded({ status: "ready", database, data: indexDatabase(database) }),
      (error: unknown) => setLoaded({ status: "failed", message: String(error) }),
    );
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", writeAddress(inputs, view));
  }, [inputs, view]);

  const simulate = (with_: Inputs) => {
    worker.current ??= new Worker(new URL("./simulate.worker.ts", import.meta.url), { type: "module" });
    const id = (nextId.current += 1);
    setSimulation({ status: "running", id, inputs: with_, done: 0 });
    worker.current.onmessage = (event: MessageEvent<Reply>) => {
      const reply = event.data;
      if (reply.id !== id) return;
      if (reply.kind === "progress") setSimulation({ status: "running", id, inputs: with_, done: reply.done });
      else if (reply.kind === "failed") setSimulation({ status: "failed", message: reply.message });
      else {
        setResults({ inputs: with_, runs: reply.results, chances: reply.chances });
        setSimulation({ status: "idle" });
      }
    };
    worker.current.onerror = (event) => setSimulation({ status: "failed", message: event.message });
    worker.current.postMessage({ id, inputs: with_ } satisfies Request);
  };

  // A link reproduces its result: the first one plays as the page opens
  useEffect(() => {
    if (initial.inputs.regions?.length !== 0) simulate(initial.inputs);
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  if (loaded.status !== "ready") {
    return (
      <main className="simulate-loading">
        <p>{loaded.status === "loading" ? words.loading : loaded.message}</p>
      </main>
    );
  }
  const { database, data } = loaded;
  const order = playOrder(database);
  const regions = order.map((id) => database.region.find((row) => row.id === id)!);
  const ticked = inputs.regions ?? order;
  const setRegions = (next: readonly string[]) =>
    setInputs((last) => ({ ...last, regions: next.length === order.length ? null : order.filter((id) => next.includes(id)) }));
  const running = simulation.status === "running";
  const stale = results !== null && !sameInputs(results.inputs, inputs);

  const classes = view.classes ?? database.character_class.map((row) => row.id);
  const toggleClass = (id: string, on: boolean) => {
    const next = database.character_class.map((row) => row.id).filter((one) => (one === id ? on : classes.includes(one)));
    setView((last) => ({ ...last, classes: next.length === database.character_class.length ? null : next }));
  };

  return (
    <main className="simulate">
      <aside className="simulate-settings">
        <ScreenHead title={words.title} lede={words.lede}>
          <a className="simulate-to-app" href="../">
            {words.toApp}
          </a>
        </ScreenHead>

        <SectionHeading
          action={<HeadingAction onClick={() => setInputs((last) => ({ ...last, seed: randomSeed() }))}>{words.newSeed}</HeadingAction>}
        >
          {words.settings}
        </SectionHeading>
        <div>
          <Stepper
            id="simulate-runs"
            label={words.runs}
            detail={words.runsDetail}
            value={inputs.runs}
            min={1}
            max={MAX_RUNS}
            correct={corrector(1, MAX_RUNS)}
            onChange={(runs) => setInputs((last) => ({ ...last, runs }))}
          />
          <div className="simulate-control">
            <span className="simulate-control-label">{words.allocation}</span>
            <Cycler<Allocation>
              label={words.allocation}
              options={ALLOCATIONS.map((value) => ({ value, label: words.allocations[value] }))}
              value={inputs.allocation}
              onChange={(allocation) => setInputs((last) => ({ ...last, allocation }))}
            />
          </div>
          <Stepper
            id="simulate-reroll"
            label={words.rerollEvery}
            detail={words.rerollEveryDetail}
            value={inputs.rerollEvery}
            min={0}
            max={99}
            correct={corrector(0, 99)}
            onChange={(rerollEvery) => setInputs((last) => ({ ...last, rerollEvery }))}
          />
          <Stepper
            id="simulate-seed"
            label={words.seed}
            value={inputs.seed}
            min={0}
            max={MAX_SEED}
            correct={corrector(0, MAX_SEED)}
            onChange={(seed) => setInputs((last) => ({ ...last, seed }))}
          />
        </div>

        <SectionHeading>{words.completion}</SectionHeading>
        <div className="simulate-pad">
          <p className="simulate-detail">{words.completionDetail(inputs.completion)}</p>
          <StopSlider
            stops={100 / COMPLETION_STEP}
            value={inputs.completion / COMPLETION_STEP - 1}
            onChange={(stop) => setInputs((last) => ({ ...last, completion: (stop + 1) * COMPLETION_STEP }))}
            label={words.completion}
            valueText={words.percent(inputs.completion)}
            ends={[words.percent(COMPLETION_STEP), words.percent(100)]}
          />
        </div>

        <SectionHeading>
          {words.regions} <HeadingCount>{ticked.length}</HeadingCount>
        </SectionHeading>
        <div className="simulate-pad">
          <p className="simulate-detail">{words.regionsDetail}</p>
        </div>
        <div>
          <LozengeCheckbox framed checked={ticked.length === order.length} onChange={(on) => setRegions(on ? order : [])}>
            {words.allRegions}
          </LozengeCheckbox>
          {regions.map((region, index) => {
            const dlc = region.name.startsWith(DLC_PREFIX);
            return (
              <LozengeCheckbox
                key={region.id}
                checked={ticked.includes(region.id)}
                onChange={(on) => setRegions(on ? [...ticked, region.id] : ticked.filter((id) => id !== region.id))}
                {...(dlc ? { tag: copy.statsAndRegions.dlc } : {})}
              >
                {words.regionNumbered(index + 1, dlc ? region.name.slice(DLC_PREFIX.length) : region.name)}
              </LozengeCheckbox>
            );
          })}
        </div>

        <BottomBar
          className="simulate-bottom"
          {...(ticked.length === 0
            ? { notice: words.noRegions }
            : simulation.status === "failed"
              ? { notice: words.failed(simulation.message) }
              : stale && !running
                ? { notice: words.stale }
                : {})}
        >
          <GlowBand
            onClick={() => {
              if (!running && ticked.length > 0) simulate(inputs);
            }}
          >
            {running ? words.simulating(simulation.done, simulation.inputs.runs) : words.simulate}
          </GlowBand>
        </BottomBar>
      </aside>

      <section className={`simulate-results${stale || running ? " simulate-results-stale" : ""}`} aria-busy={running}>
        <Results
          data={data}
          runs={results?.runs ?? null}
          chances={results?.chances ?? null}
          classes={classes}
          view={view}
          onTab={(tab) => setView((last) => ({ ...last, tab }))}
          filters={
            <>
            <div className="simulate-classes">
              <Chips label={words.classes}>
                {database.character_class.map((row) => (
                  <ChipButton key={row.id} pressed={classes.includes(row.id)} onToggle={(on) => toggleClass(row.id, on)}>
                    {row.name}
                  </ChipButton>
                ))}
                <ChipButton
                  pressed={view.classes === null}
                  onToggle={() => setView((last) => ({ ...last, classes: last.classes === null ? [] : null }))}
                >
                  {words.allClasses}
                </ChipButton>
              </Chips>
            </div>
            <div className="simulate-search">
              <SearchField label={words.searchLabel} placeholder={words.searchPlaceholder} value={view.search} onChange={(search) => setView((last) => ({ ...last, search }))} />
            </div>
            </>
          }
        />
      </section>
    </main>
  );
}

function Results({
  data,
  runs,
  chances,
  classes,
  view,
  onTab,
  filters,
}: {
  readonly data: EngineData;
  readonly runs: readonly RunResult[] | null;
  readonly chances: ChanceSums | null;
  readonly classes: readonly string[];
  readonly view: View;
  readonly onTab: (tab: View["tab"]) => void;
  /** The class filter and the search, in the sticky header above the tabs. */
  readonly filters: ReactNode;
}) {
  // The picked classes, compared by their ids: a new array of the same ids counts nothing again
  const picked = classes.join();
  const sample = useMemo(() => (runs === null ? null : sampleOf(data, runs, classes)), [data, runs, picked]);
  const note = (text: string) => <p className="simulate-lede simulate-note">{text}</p>;
  const panels =
    sample === null
      ? TABS.map(() => note(words.loading))
      : classes.length === 0
        ? TABS.map(() => note(words.noClasses))
        : [
            <Overview key="overview" sample={sample} search={view.search} />,
            <Gear key="gear" sample={sample} search={view.search} />,
            <Boosts key="boosts" sample={sample} search={view.search} />,
            <Decay key="decay" sample={sample} chances={chances ?? new Map()} search={view.search} />,
          ];
  const selected = TABS.indexOf(view.tab);
  // Only the selected panel is drawn: the others would count the whole sample again for nothing
  return (
    <Tabs
      label={words.title}
      tabs={words.tabs}
      selected={selected}
      onSelect={(index) => onTab(TABS[index]!)}
      panels={panels.map((panel, index) => (index === selected ? panel : null))}
      bar={(row) => (
        <ResultsHeader>
          {filters}
          {row}
        </ResultsHeader>
      )}
    />
  );
}

/** The class filter, the search and the tabs: stuck to the top, out of the way while the page scrolls down and back
 * as soon as it scrolls up, as on the UI kit's page. */
function ResultsHeader({ children }: { readonly children: ReactNode }) {
  const hidden = useHideOnScroll();
  return <div className={`simulate-header${hidden ? " simulate-header-hidden" : ""}`}>{children}</div>;
}
