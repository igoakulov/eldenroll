import { useMemo } from "react";

import { Fragment } from "react";

import { outsideSynergy, synergyWins, THIN_SAMPLE, type Sample, type SynergyRow } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable } from "../ui/DataTable";
import { SectionHeading, SectionNote } from "../ui/Headings";
import { FOLD, matches, modifierRule, percent, perRun } from "./format";

const words = copy.simulate.synergies;
const columns = copy.simulate.columns;

export function Synergies({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const wins = useMemo(() => synergyWins(sample), [sample]);
  const outside = useMemo(() => outsideSynergy(sample), [sample]);
  const shown = (row: SynergyRow) => {
    const { when, target } = modifierRule(row.modifier);
    return matches(`${row.modifier.id} ${when} ${target}`, search);
  };
  return (
    <>
      <SynergyTable title={words.wins} lede={words.winsLede} share={words.won} rows={wins.filter(shown)} />
      <SynergyTable
        title={words.outside}
        lede={words.outsideLede}
        share={words.without}
        rows={outside.filter(shown)}
        struck
      />
    </>
  );
}

/** One modifier a row: its id, its rule in game names, condition over target, its multiplier, a share and how often
 * it counted per run. `struck` crosses out the condition, for a table of what showed without it. */
function SynergyTable({
  title,
  lede,
  share,
  rows,
  struck = false,
}: {
  readonly title: string;
  readonly lede: string;
  /** The share column's heading. */
  readonly share: string;
  readonly rows: readonly SynergyRow[];
  readonly struck?: boolean;
}) {
  return (
    <section className="simulate-section">
      <SectionHeading>{title}</SectionHeading>
      <SectionNote>{lede}</SectionNote>
      <DataTable<SynergyRow>
        label={title}
        columns={[
          {
            id: "id",
            label: words.id,
            sortValue: (row) => row.modifier.id,
            // An id is one long word; it may break after each underscore, so the rule beside it keeps its width
            render: (row) =>
              row.modifier.id.split("_").map((part, index, parts) => (
                <Fragment key={index}>
                  {index < parts.length - 1 ? `${part}_` : part}
                  <wbr />
                </Fragment>
              )),
          },
          {
            id: "rule",
            label: words.rule,
            render: (row) => {
              const { when, target } = modifierRule(row.modifier);
              return (
                <>
                  {struck ? <s>{when}</s> : when}
                  <br />
                  {target}
                </>
              );
            },
          },
          {
            id: "boost",
            label: columns.boost,
            numeric: true,
            sortValue: (row) => row.modifier.value,
            render: (row) => words.times(row.modifier.value.toLocaleString("en-GB")),
          },
          { id: "share", label: share, numeric: true, sortValue: (row) => row.share, render: (row) => percent(row.share) },
          { id: "per-run", label: columns.perRun, numeric: true, sortValue: (row) => row.perRun, render: (row) => perRun(row.perRun) },
        ]}
        rows={rows}
        rowKey={(row) => row.modifier.id}
        fold={FOLD}
        faded={(row) => row.count < THIN_SAMPLE}
        initialSort="boost"
        empty={copy.simulate.nothing}
      />
    </section>
  );
}
