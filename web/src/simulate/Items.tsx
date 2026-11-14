import { itemSeries, items, oddsOf, THIN_SAMPLE, type ItemRow, type Sample } from "../../sim/aggregate";
import { BUCKET, stretchOf, type ChanceSums } from "../../sim/simulate";
import { copy } from "../copy";
import { DataTable } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { LineChart } from "../ui/LineChart";
import { decimal, FOLD, matches, multiplier, percent } from "./format";

const words = copy.simulate.items;
const columns = copy.simulate.columns;

/** How many matches get a chart; the rest stay in the table. */
const CHARTED = 4;

/** The smallest round number at or above `top`, one significant digit: each chart's own scale. */
function niceMax(top: number): number {
  if (top <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(top));
  return Math.ceil(top / step - 1e-9) * step;
}

/** Per-item inspection: a table of everything in reach, and a chart of each searched item's chance over the run. */
export function Items({
  sample,
  chances,
  search,
}: {
  readonly sample: Sample;
  readonly chances: ChanceSums;
  readonly search: string;
}) {
  const rows = items(sample, chances).filter((row) => matches(row.name, search));
  const charted = search === "" ? [] : [...rows].sort((a, b) => a.name.localeCompare(b.name)).slice(0, CHARTED);
  const runs = sample.results.length;
  return (
    <>
      <section className="simulate-section">
        <SectionHeading>{words.overTheRun}</SectionHeading>
        <p className="simulate-lede">
          {charted.length === 0 ? words.searchToChart : words.chartLede(charted.length, rows.length - charted.length)}
        </p>
        {charted.map((row) => (
          <ItemCharts key={row.key} sample={sample} chances={chances} row={row} />
        ))}
      </section>
      <section className="simulate-section">
        <SectionHeading>{words.items}</SectionHeading>
        <p className="simulate-lede">{words.itemsLede}</p>
        <DataTable<ItemRow>
          label={words.items}
          columns={[
            { id: "name", label: columns.name, sortValue: (row) => row.name, render: (row) => row.name },
            {
              id: "shown",
              label: columns.shownPerRun,
              numeric: true,
              sortValue: (row) => row.shownPerRun,
              render: (row) => decimal(row.shownPerRun, 1),
            },
            {
              id: "seen",
              label: columns.seenIn,
              numeric: true,
              // Rarest first
              sortValue: (row) => -row.seenIn,
              render: (row) => percent(row.seenIn / runs, 0),
            },
            {
              id: "ceiling",
              label: columns.ceiling,
              numeric: true,
              sortValue: (row) => row.ceiling ?? 0,
              render: (row) => (row.ceiling === null ? "–" : words.times(multiplier(row.ceiling))),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.key}
          fold={FOLD}
          faded={() => sample.objectives.length < THIN_SAMPLE}
          initialSort="seen"
          empty={copy.simulate.nothing}
        />
      </section>
    </>
  );
}

function ItemCharts({ sample, chances, row }: { readonly sample: Sample; readonly chances: ChanceSums; readonly row: ItemRow }) {
  const { odds, ceiling } = oddsOf(sample.data, row.key);
  // Every chart's axis runs over the whole run, so a line starts where its item came into reach
  const lastStretch = stretchOf(Math.max(1, ...sample.all.map((one) => one.row.objective)));
  const formatOdds = (value: number) => decimal(value, value < 1 ? 2 : 1);
  return (
    <div className="simulate-item">
      <h3 className="simulate-item-name">{row.name}</h3>
      <p className="simulate-lede">{words.metrics(formatOdds(odds), ceiling === null ? null : multiplier(ceiling))}</p>
      <div className="simulate-charts">
        {itemSeries(sample, chances, row.key).map(({ slot, points, shown }) => {
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
