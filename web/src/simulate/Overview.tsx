import { classShares, runSummary, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { STATS } from "../engine/settings";
import { DataTable } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { decimal } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate;

export function Overview({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const summary = runSummary(sample);
  const summaryRows = [
    { key: "objectives", name: words.overview.objectives, value: decimal(summary.objectives, 1) },
    { key: "level", name: words.overview.level, value: decimal(summary.level, 0) },
    ...STATS.map((stat) => ({ key: stat, name: STAT_NAMES[stat], value: decimal(summary.stats[stat], 0) })),
  ];
  return (
    <>
      <section className="simulate-section">
        <SectionHeading>{words.overview.runs}</SectionHeading>
        <p className="simulate-lede">{`${words.overview.runsCount(summary.runs)}. ${words.overview.perRun}.`}</p>
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

      <ShareSection title={words.overview.classes} lede={words.overview.classesLede} table={classShares(sample)} search={search} />

    </>
  );
}
