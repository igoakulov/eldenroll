import {
  catchUpByRegion,
  neverRolled,
  regionName,
  repeats,
  THIN_SAMPLE,
  type CatchUpRow,
  type RepeatRow,
  type Sample,
} from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { decimal, FOLD, matches, multiplier, percent, perRun } from "./format";

const words = copy.simulate.variety;
const columns = copy.simulate.columns;

/** How evenly a run spreads what it shows: catch-up by region, repeats and what never showed. */
export function Variety({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const never = neverRolled(sample);
  return (
    <>
      <section className="simulate-section">
        <SectionHeading>{words.catchUp}</SectionHeading>
        <p className="simulate-lede">{words.catchUpLede}</p>
        <CatchUpTable
          label={columns.region}
          rows={catchUpByRegion(sample)}
          name={(key) => (key === "" ? words.noLocation : regionName(sample.data, key))}
        />
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.repeats}</SectionHeading>
        <p className="simulate-lede">{words.repeatsLede}</p>
        <DataTable<RepeatRow>
          label={words.repeats}
          columns={[
            { id: "kind", label: columns.what, render: (row) => words.repeatKinds[row.kind] },
            { id: "per-run", label: columns.perRun, numeric: true, sortValue: (row) => row.showings, render: (row) => perRun(row.perRun) },
            { id: "gap", label: columns.gap, numeric: true, sortValue: (row) => row.gap, render: (row) => decimal(row.gap, 1) },
            { id: "soon", label: columns.soon, numeric: true, sortValue: (row) => row.soon, render: (row) => percent(row.soon) },
          ]}
          rows={repeats(sample)}
          rowKey={(row) => row.kind}
          faded={(row) => row.showings < THIN_SAMPLE}
        />
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.neverRolled}</SectionHeading>
        <NameList title={words.inReach} names={never.inReach.filter((name) => matches(name, search))} />
        <NameList title={words.outOfReach} names={never.outOfReach.filter((name) => matches(name, search))} />
      </section>
    </>
  );
}

function CatchUpTable({
  label,
  rows,
  name,
}: {
  readonly label: string;
  readonly rows: readonly CatchUpRow[];
  readonly name: (key: string) => string;
}) {
  const scale = Math.max(0, ...rows.map((row) => row.share));
  return (
    <DataTable<CatchUpRow>
      label={label}
      columns={[
        { id: "name", label, render: (row) => name(row.key) },
        { id: "per-run", label: columns.perRun, numeric: true, sortValue: (row) => row.count, render: (row) => perRun(row.perRun) },
        {
          id: "share",
          label: columns.share,
          numeric: true,
          sortValue: (row) => row.share,
          render: (row) => <ShareBar share={row.share} scale={scale} text={percent(row.share)} />,
        },
        {
          id: "catch-up",
          label: columns.boost,
          numeric: true,
          sortValue: (row) => row.catchUp,
          render: (row) => words.times(multiplier(row.catchUp)),
        },
      ]}
      rows={rows}
      rowKey={(row) => row.key}
      fold={FOLD}
      faded={(row) => row.count < THIN_SAMPLE}
      empty={copy.simulate.nothing}
    />
  );
}

function NameList({ title, names }: { readonly title: string; readonly names: readonly string[] }) {
  return (
    <div className="simulate-names">
      <h3 className="simulate-names-title">{`${title} (${names.length})`}</h3>
      <p className="simulate-names-list">{names.length === 0 ? copy.simulate.nothing : names.join(", ")}</p>
    </div>
  );
}
