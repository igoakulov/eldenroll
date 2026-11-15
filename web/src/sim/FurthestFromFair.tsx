import { className, worstLines, WORST_SHARE, type FairLine, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable } from "../ui/DataTable";
import { Section } from "../ui/Headings";
import { decimal, FOLD, matches, percent, perRun, rowName } from "./format";

const words = copy.sim.slots;

const lineRow = (line: FairLine) => ({ key: line.key, name: line.region, ...(line.order === undefined ? {} : { order: line.order }) });
const columns = copy.sim.columns;

/** Every slot's lines furthest from fair, under and over alike, worst first. */
export function FurthestFromFair({
  sample,
  lines,
  search,
}: {
  readonly sample: Sample;
  readonly lines: readonly FairLine[];
  readonly search: string;
}) {
  const worst = worstLines(lines).filter((line) => matches(rowName(lineRow(line)), search));
  if (search !== "" && worst.length === 0) return null;
  return (
    <Section title={words.furthest} lede={words.furthestLede(percent(WORST_SHARE, 0))}>
      <DataTable<FairLine>
        label={words.furthest}
        columns={[
          {
            id: "class",
            label: columns.klass,
            sortValue: (line) => className(sample.data, line.characterClass),
            render: (line) => className(sample.data, line.characterClass),
          },
          { id: "slot", label: columns.slot, sortValue: (line) => words[line.table], render: (line) => words[line.table] },
          {
            id: "region",
            label: columns.region,
            sortValue: (line) => (line.order === undefined ? line.region : String(line.order).padStart(3, "0")),
            render: (line) => rowName(lineRow(line)),
          },
          { id: "fair", label: columns.fair, numeric: true, sortValue: (line) => line.vsFair, render: (line) => decimal(line.vsFair) },
          {
            id: "fair-per-run",
            label: columns.fairPerRun,
            numeric: true,
            sortValue: (line) => line.fairPerRun,
            render: (line) => perRun(line.fairPerRun),
          },
        ]}
        rows={worst}
        rowKey={(line) => `${line.characterClass}/${line.table}/${line.key}`}
        fold={FOLD}
        empty={copy.sim.nothing}
      />
    </Section>
  );
}
