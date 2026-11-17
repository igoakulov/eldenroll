import { gap, worstLines, type FairLine, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable } from "../ui/DataTable";
import { Section } from "../ui/Headings";
import { FOLD, lineClasses, matches, rowName, showings, signedShowings } from "./format";

const words = copy.sim.slots;

const lineRow = (line: FairLine) => ({ key: line.key, name: line.region, ...(line.order === undefined ? {} : { order: line.order }) });
const columns = copy.sim.columns;

/** Every slot's lines whose gap from fair matters for play, under and over alike, largest first. */
export function FurthestFromFair({
  sample,
  lines,
  search,
}: {
  readonly sample: Sample;
  readonly lines: readonly FairLine[];
  readonly search: string;
}) {
  const runs = sample.results.length;
  const all = worstLines(lines, runs);
  const worst = all.filter((line) => matches(rowName(lineRow(line)), search));
  if (search !== "" && worst.length === 0) return null;
  return (
    <Section title={words.furthest} lede={words.furthestLede(runs, all.length)}>
      <DataTable<FairLine>
        label={words.furthest}
        columns={[
          {
            id: "class",
            label: columns.klass,
            sortValue: (line) => lineClasses(sample, line),
            render: (line) => lineClasses(sample, line),
          },
          { id: "slot", label: columns.slot, sortValue: (line) => words[line.table], render: (line) => words[line.table] },
          {
            id: "region",
            label: columns.region,
            sortValue: (line) => (line.order === undefined ? line.region : String(line.order).padStart(3, "0")),
            render: (line) => rowName(lineRow(line)),
          },
          { id: "shown", label: columns.shown, numeric: true, sortValue: (line) => line.shown, render: (line) => showings(line.shown) },
          { id: "fair", label: columns.fairShowings, numeric: true, sortValue: (line) => line.fair, render: (line) => showings(line.fair) },
          {
            id: "gap",
            label: columns.gap,
            numeric: true,
            sortValue: (line) => Math.abs(gap(line)),
            render: (line) => signedShowings(gap(line)),
          },
        ]}
        rows={worst}
        rowKey={(line) => `${line.classes.join(",")}/${line.table}/${line.key}`}
        fold={FOLD}
        empty={copy.sim.nothing}
      />
    </Section>
  );
}
