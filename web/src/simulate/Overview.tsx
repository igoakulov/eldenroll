import {
  className,
  classShares,
  empties,
  neverRolled,
  ruleNone,
  runSummary,
  type EmptyRow,
  type Sample,
} from "../../sim/aggregate";
import { copy } from "../copy";
import { STATS } from "../engine/settings";
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { decimal, matches, percent } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate;

export function Overview({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const summary = runSummary(sample);
  const none = ruleNone(sample);
  const never = neverRolled(sample);
  const empty = empties(sample);
  const summaryRows = [
    { key: "objectives", name: words.overview.objectives, value: decimal(summary.objectives, 1) },
    { key: "rerolls", name: words.overview.rerolls, value: decimal(summary.rerolls, 1) },
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

      <section className="simulate-section">
        <SectionHeading>{words.overview.ruleNone}</SectionHeading>
        <p className="simulate-lede">{`${words.overview.ruleNoneNote} ${words.counted(none.total)}`}</p>
        <div className="simulate-rows">
          <ListRow title={words.overview.neither} value={percent(none.total === 0 ? NaN : none.neither / none.total)} />
          <ListRow title={words.overview.one} value={percent(none.total === 0 ? NaN : none.one / none.total)} />
        </div>
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.overview.neverRolled}</SectionHeading>
        <NameList title={words.overview.inReach} names={never.inReach.filter((name) => matches(name, search))} />
        <NameList title={words.overview.outOfReach} names={never.outOfReach.filter((name) => matches(name, search))} />
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.overview.empties}</SectionHeading>
        <p className="simulate-lede">{words.overview.emptiesLede}</p>
        <DataTable<EmptyRow>
          label={words.overview.empties}
          columns={[
            {
              id: "class",
              label: words.columns.klass,
              sortValue: (row) => className(sample.data, row.characterClass),
              render: (row) => className(sample.data, row.characterClass),
            },
            { id: "slot", label: words.columns.slot, render: (row) => words.slotNames[row.slot] },
            { id: "count", label: words.columns.rolls, numeric: true, sortValue: (row) => row.count, render: (row) => row.count },
            {
              id: "share",
              label: words.columns.share,
              numeric: true,
              sortValue: (row) => row.share,
              render: (row) => (
                <ShareBar share={row.share} scale={Math.max(...empty.map((one) => one.share))} text={percent(row.share)} />
              ),
            },
          ]}
          rows={empty}
          rowKey={(row) => `${row.characterClass}/${row.slot}`}
          initialSort="count"
          empty={words.overview.noEmpties}
        />
      </section>
    </>
  );
}

function NameList({ title, names }: { readonly title: string; readonly names: readonly string[] }) {
  return (
    <div className="simulate-names">
      <h3 className="simulate-names-title">{`${title} (${names.length})`}</h3>
      <p className="simulate-names-list">{names.length === 0 ? words.nothing : names.join(", ")}</p>
    </div>
  );
}
