import { useMemo } from "react";

import { itemSeries, items, neverRolled, oddsOf, type ItemRow, type Sample } from "../../sim/aggregate";
import { BUCKET, stretchOf, type ChanceSums } from "../../sim/simulate";
import { copy } from "../copy";
import { SectionHeading, SectionNote, SlotHeading } from "../ui/Headings";
import { LineChart } from "../ui/LineChart";
import { decimal, matches, multiplier, percent } from "./format";

const words = copy.simulate.items;

/** How many matches get charts: enough for a whole armor set with its variants. */
const CHARTED = 10;

/** The smallest round number at or above `top`, one significant digit: each chart's own scale. */
function niceMax(top: number): number {
  if (top <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(top));
  return Math.ceil(top / step - 1e-9) * step;
}

/** Per-item inspection: a chart of each searched item's chance over the run, in every slot it rolls in. */
export function Items({
  sample,
  chances,
  search,
}: {
  readonly sample: Sample;
  readonly chances: ChanceSums;
  readonly search: string;
}) {
  const all = useMemo(() => items(sample, chances), [sample, chances]);
  const never = useMemo(() => neverRolled(sample), [sample]);
  const rows = all.filter((row) => matches(row.name, search));
  const charted = search === "" ? [] : [...rows].sort((a, b) => a.name.localeCompare(b.name)).slice(0, CHARTED);
  return (
    <>
      <section className="simulate-section">
        <SectionHeading>{words.overTheRun}</SectionHeading>
        <SectionNote>
          {charted.length === 0 ? words.searchToChart : words.chartLede(charted.length, rows.length - charted.length)}
        </SectionNote>
        {charted.map((row) => (
          <ItemCharts key={row.key} sample={sample} chances={chances} row={row} />
        ))}
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.neverRolled}</SectionHeading>
        <NameList title={words.inReach} names={never.inReach.filter((name) => matches(name, search))} />
        <NameList title={words.outOfReach} names={never.outOfReach.filter((name) => matches(name, search))} />
      </section>
    </>
  );
}

function NameList({ title, names }: { readonly title: string; readonly names: readonly string[] }) {
  return (
    <>
      <SlotHeading>{`${title} (${names.length})`}</SlotHeading>
      <p className="simulate-names-list">{names.length === 0 ? copy.simulate.nothing : names.join(", ")}</p>
    </>
  );
}

function ItemCharts({ sample, chances, row }: { readonly sample: Sample; readonly chances: ChanceSums; readonly row: ItemRow }) {
  const series = useMemo(() => itemSeries(sample, chances, row.key), [sample, chances, row.key]);
  const odds = oddsOf(sample.data, row.key);
  // Every chart's axis runs over the whole run, so a line starts where its item came into reach
  const lastStretch = stretchOf(Math.max(1, ...sample.all.map((one) => one.row.objective)));
  const formatOdds = (value: number) => decimal(value, value < 1 ? 2 : 1);
  return (
    <div className="simulate-item">
      <h3 className="simulate-item-name">{row.name}</h3>
      <SectionNote>{words.metrics(formatOdds(odds))}</SectionNote>
      <div className="simulate-charts">
        {series.map(({ slot, points, shown }) => {
          const yMax = niceMax(Math.max(0, ...points.flatMap((point) => [point.chance, point.plain])));
          const digits = yMax < 0.1 ? 1 : 0;
          return (
            <LineChart
              key={slot}
              title={copy.simulate.slotNames[slot]}
              points={points.map((point) => ({ x: point.x, y: point.chance }))}
              baseline={points.map((point) => ({ x: point.x, y: point.plain }))}
              marks={shown}
              xRange={[1, lastStretch]}
              yMax={yMax}
              formatY={(value) => percent(value, digits)}
              formatX={String}
              describe={(index) => {
                const point = points[index]!;
                const to = point.x + BUCKET - 1;
                return {
                  title: words.point(point.x, to),
                  facts: [
                    { label: words.chance, value: percent(point.chance, digits + 1) },
                    { label: words.withoutCatchUp, value: percent(point.plain, digits + 1) },
                    { label: words.catchUpBoost, value: words.times(multiplier(point.catchUp)) },
                    { label: words.shownSoFar(to), value: decimal(point.shown, 1) },
                  ],
                };
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
