import { useMemo } from "react";

import { classShares, repeats, runSummary, THIN_SAMPLE, type RepeatRow, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { STATS } from "../engine/settings";
import { DataTable } from "../ui/DataTable";
import { SectionHeading, SectionNote } from "../ui/Headings";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { decimal, percent, perRun } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate;

export function Overview({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const summary = useMemo(() => runSummary(sample), [sample]);
  const classes = useMemo(() => classShares(sample), [sample]);
  const repeated = useMemo(() => repeats(sample), [sample]);
  const summaryRows = [
    { key: "objectives", name: words.overview.objectives, value: decimal(summary.objectives, 1) },
    { key: "level", name: words.overview.level, value: decimal(summary.level, 0) },
    ...STATS.map((stat) => ({ key: stat, name: STAT_NAMES[stat], value: decimal(summary.stats[stat], 0) })),
  ];
  return (
    <>
      <section className="simulate-section">
        <SectionHeading>{words.overview.runs}</SectionHeading>
        <SectionNote>{`${words.overview.runsCount(summary.runs)}. ${words.overview.perRun}.`}</SectionNote>
        <DataTable
          label={words.overview.runs}
          columns={[
            { id: "name", label: words.columns.what, render: (row) => row.name },
            { id: "value", label: words.columns.value, numeric: true, render: (row) => row.value },
          ]}
          rows={summaryRows}
          rowKey={(row) => row.key}
        />
      </section>

      <ShareSection title={words.overview.classes} lede={words.overview.classesLede} table={classes} search={search} />

      <section className="simulate-section">
        <SectionHeading>{words.overview.repeats}</SectionHeading>
        <SectionNote>{words.overview.repeatsLede}</SectionNote>
        <DataTable<RepeatRow>
          label={words.overview.repeats}
          columns={[
            { id: "kind", label: words.columns.what, render: (row) => words.overview.repeatKinds[row.kind] },
            { id: "per-run", label: words.columns.perRun, numeric: true, sortValue: (row) => row.showings, render: (row) => perRun(row.perRun) },
            { id: "gap", label: words.columns.gap, numeric: true, sortValue: (row) => row.gap, render: (row) => decimal(row.gap, 1) },
            { id: "soon", label: words.columns.soon, numeric: true, sortValue: (row) => row.soon, render: (row) => percent(row.soon) },
          ]}
          rows={repeated}
          rowKey={(row) => row.kind}
          faded={(row) => row.showings < THIN_SAMPLE}
        />
      </section>
    </>
  );
}
