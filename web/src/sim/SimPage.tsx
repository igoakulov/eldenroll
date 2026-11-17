import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
import { ControlRow } from "../ui/Rows";
import { HeadingAction, HeadingCount, ScreenHead, Section, SectionHeading, SectionNote } from "../ui/Headings";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { SearchField } from "../ui/SearchField";
import { Stepper } from "../ui/Stepper";
import { StopSlider } from "../ui/StopSlider";
import { Tabs } from "../ui/Tabs";
import { StickyHeader } from "../ui/StickyHeader";
import { Synergies } from "./Synergies";
import { Items } from "./Items";
import { Slots } from "./Slots";
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
import { Overview } from "./Overview";
import type { Reply, Request } from "./sim.worker";
import "./SimPage.css";
import { splitDlc } from "../engine/regions";

const words = copy.sim;

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

export function SimPage() {
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
  // Fetched once: the page reads it, and every run request hands it to the worker
  const fetched = useRef<Promise<Database> | null>(null);
  const loadOnce = () => (fetched.current ??= loadDatabase());

  useEffect(() => {
    loadOnce().then(
      (database) => setLoaded({ status: "ready", database, data: indexDatabase(database) }),
      (error: unknown) => setLoaded({ status: "failed", message: String(error) }),
    );
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", writeAddress(inputs, view));
  }, [inputs, view]);

  const simulate = (with_: Inputs) => {
    worker.current ??= new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
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
    void loadOnce().then((loadedDatabase) =>
      worker.current?.postMessage({ id, inputs: with_, database: loadedDatabase } satisfies Request),
    );
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
      <main className="sim">
        <div className="sim-note">
          <Section lede={loaded.status === "loading" ? words.loading : loaded.message} />
        </div>
      </main>
    );
  }
  const { database, data } = loaded;
  const order = playOrder(database);
  const regions = order.map((id) => database.region.find((row) => row.id === id)!);
  const checked = inputs.regions ?? order;
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
    <main className="sim">
      <aside className="sim-settings">
        <ScreenHead title={words.title} lede={words.lede}>
          <a className="sim-to-app" href="../">
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
            id="sim-runs"
            label={words.runs}
            detail={words.runsDetail}
            value={inputs.runs}
            min={1}
            max={MAX_RUNS}
            correct={corrector(1, MAX_RUNS)}
            onChange={(runs) => setInputs((last) => ({ ...last, runs }))}
          />
          <ControlRow label={words.allocation}>
            <Cycler<Allocation>
              label={words.allocation}
              options={ALLOCATIONS.map((value) => ({ value, label: words.allocations[value] }))}
              value={inputs.allocation}
              onChange={(allocation) => setInputs((last) => ({ ...last, allocation }))}
            />
          </ControlRow>
          <Stepper
            id="sim-seed"
            label={words.seed}
            value={inputs.seed}
            min={0}
            max={MAX_SEED}
            correct={corrector(0, MAX_SEED)}
            onChange={(seed) => setInputs((last) => ({ ...last, seed }))}
          />
        </div>

        <SectionHeading>{words.completion}</SectionHeading>
        <div className="sim-pad">
          <SectionNote>{words.completionDetail(inputs.completion)}</SectionNote>
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
          {words.regions} <HeadingCount>{checked.length}</HeadingCount>
        </SectionHeading>
        <div className="sim-pad">
          <SectionNote>{words.regionsDetail}</SectionNote>
        </div>
        <div>
          <LozengeCheckbox framed checked={checked.length === order.length} onChange={(on) => setRegions(on ? order : [])}>
            {words.allRegions}
          </LozengeCheckbox>
          {regions.map((region, index) => {
            const { dlc, name } = splitDlc(region.name);
            return (
              <LozengeCheckbox
                key={region.id}
                checked={checked.includes(region.id)}
                onChange={(on) => setRegions(on ? [...checked, region.id] : checked.filter((id) => id !== region.id))}
                {...(dlc ? { tag: copy.statsAndRegions.dlc } : {})}
              >
                {words.regionNumbered(index + 1, name)}
              </LozengeCheckbox>
            );
          })}
        </div>

        <BottomBar
          className="sim-bottom"
          {...(checked.length === 0
            ? { notice: words.noRegions }
            : simulation.status === "failed"
              ? { notice: words.failed(simulation.message) }
              : stale && !running
                ? { notice: words.stale }
                : {})}
        >
          <GlowBand
            onClick={() => {
              if (!running && checked.length > 0) simulate(inputs);
            }}
          >
            {running ? words.simulating(simulation.done, simulation.inputs.runs) : words.simulate}
          </GlowBand>
        </BottomBar>
      </aside>

      <section className="sim-results" aria-busy={running}>
        <Results
          dimmed={stale || running}
          data={data}
          runs={results?.runs ?? null}
          chances={results?.chances ?? null}
          classes={classes}
          view={view}
          onView={(change) => setView((last) => ({ ...last, ...change }))}
          filters={
            <>
              <div className="sim-classes">
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
              <SearchField
                label={words.searchLabel}
                placeholder={words.searchPlaceholder}
                value={view.search}
                onChange={(search) => setView((last) => ({ ...last, search }))}
              />
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
  onView,
  filters,
  dimmed,
}: {
  readonly data: EngineData;
  readonly runs: readonly RunResult[] | null;
  readonly chances: ChanceSums | null;
  readonly classes: readonly string[];
  readonly view: View;
  readonly onView: (change: Partial<View>) => void;
  /** The class filter and the search, in the sticky header above the tabs. */
  readonly filters: ReactNode;
  /** Results from earlier settings, or being replaced. */
  readonly dimmed: boolean;
}) {
  // The picked classes, compared by their ids: a new array of the same ids counts nothing again
  const picked = classes.join();
  const sample = useMemo(() => (runs === null ? null : sampleOf(data, runs, classes)), [data, runs, picked]);
  // The tables filter as the search changes, behind the typing rather than in its way
  const search = useDeferredValue(view.search);
  const sums = useMemo(() => chances ?? new Map(), [chances]);
  const note = (text: string) => (
    <div className="sim-note">
      <Section lede={text} />
    </div>
  );
  const panels =
    sample === null
      ? TABS.map(() => note(words.loading))
      : classes.length === 0
        ? TABS.map(() => note(words.noClasses))
        : [
            <Overview key="overview" sample={sample} search={search} />,
            <Slots key="slots" sample={sample} search={search} by={view.by} onBy={(by) => onView({ by })} />,
            <Synergies key="synergies" sample={sample} search={search} />,
            <Items key="items" sample={sample} chances={sums} search={search} />,
          ];
  const selected = TABS.indexOf(view.tab);
  // The tab answers at once; its panel draws behind it, a note standing in until it is ready
  const drawn = useDeferredValue(selected);
  // Only the selected panel is drawn: the others would count the whole sample again for nothing
  return (
    <Tabs
      label={words.title}
      tabs={words.tabs}
      selected={selected}
      onSelect={(index) => onView({ tab: TABS[index]! })}
      panels={panels.map((panel, index) => (index !== selected ? null : index === drawn ? panel : note(words.loading)))}
      bar={(row) => (
        // The class filter, the search and the tabs, back in view on any scroll up
        <StickyHeader>
          {filters}
          {row}
        </StickyHeader>
      )}
      dimmed={dimmed}
    />
  );
}

