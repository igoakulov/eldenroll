import { fairDistance, gap, worstLines, type FairLine, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable } from "../ui/DataTable";
import { Section } from "../ui/Headings";
import { decimal, FOLD, lineClasses, matches, perRun, rowName, signedPerRun } from "./format";

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
  const worst = all.filter((line) => [lineClasses(sample, line), words[line.table], rowName(lineRow(line))].some((text) => matches(text, search)));
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
          { id: "shown", label: columns.perRun, numeric: true, sortValue: (line) => line.shown, render: (line) => perRun(line.shown / runs) },
          { id: "fair", label: columns.fairPerRun, numeric: true, sortValue: (line) => line.fair, render: (line) => perRun(line.fair / runs) },
          {
            id: "gap",
            label: columns.gap,
            numeric: true,
            sortValue: (line) => Math.abs(gap(line)),
            render: (line) => signedPerRun(gap(line) / runs),
          },
          {
            id: "vs-fair",
            label: columns.fair,
            numeric: true,
            sortValue: (line) => fairDistance(line.shown / line.fair),
            render: (line) => decimal(line.shown / line.fair),
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
