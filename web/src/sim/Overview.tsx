import { useMemo } from "react";

import { classShares, repeats, runSummary, THIN_SAMPLE, type RepeatRow, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { STATS } from "../engine/settings";
import { DataTable } from "../ui/DataTable";
import { Section } from "../ui/Headings";
import { decimal, percent } from "./format";
import { countOnce } from "./countOnce";
import { perRunColumn } from "./columns";
import { ShareSection } from "./ShareSection";

const words = copy.sim;

export function Overview({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const summary = useMemo(() => countOnce(sample, "summary", () => runSummary(sample)), [sample]);
  const classes = useMemo(() => countOnce(sample, "classes", () => classShares(sample)), [sample]);
  const repeated = useMemo(() => countOnce(sample, "repeats", () => repeats(sample)), [sample]);
  const summaryRows = [
    { key: "objectives", name: words.overview.objectives, value: decimal(summary.objectives, 1) },
    { key: "level", name: words.overview.level, value: decimal(summary.level, 0) },
    ...STATS.map((stat) => ({ key: stat, name: copy.statsAndRegions.stats[stat], value: decimal(summary.stats[stat], 0) })),
  ];
  return (
    <>
      <Section title={words.overview.runs} lede={`${words.overview.runsCount(summary.runs)}. ${words.overview.perRun}.`}>
        <DataTable
          label={words.overview.runs}
          columns={[
            { id: "name", label: words.columns.what, render: (row) => row.name },
            { id: "value", label: words.columns.value, numeric: true, render: (row) => row.value },
          ]}
          rows={summaryRows}
          rowKey={(row) => row.key}
        />
      </Section>

      <ShareSection title={words.overview.classes} lede={words.overview.classesLede} table={classes} search={search} />

      <Section title={words.overview.repeats} lede={words.overview.repeatsLede}>
        <DataTable<RepeatRow>
          label={words.overview.repeats}
          columns={[
            { id: "kind", label: words.columns.what, render: (row) => words.overview.repeatKinds[row.kind] },
            perRunColumn((row) => row.showings),
            { id: "apart", label: words.columns.apart, numeric: true, sortValue: (row) => row.gap, render: (row) => decimal(row.gap, 1) },
            { id: "soon", label: words.columns.soon, numeric: true, sortValue: (row) => row.soon, render: (row) => percent(row.soon) },
            {
              id: "pastLimit",
              label: words.columns.pastLimit,
              numeric: true,
              sortValue: (row) => row.pastLimit,
              render: (row) => percent(row.pastLimit),
            },
          ]}
          rows={repeated}
          rowKey={(row) => row.kind}
          faded={(row) => row.showings < THIN_SAMPLE}
        />
      </Section>
    </>
  );
}
