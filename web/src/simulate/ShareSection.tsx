import type { ReactNode } from "react";

import { THIN_SAMPLE, type ShareRow, type ShareTable } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, ShareBar, type DataColumn } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { FOLD, matches, multiplier, percent, perRun } from "./format";

const words = copy.simulate;

/** A section of shares: its heading, a line on what it counts, a `control` such as a switch of how it counts, and
 * the table, filtered by the search. */
export function ShareSection({
  title,
  lede,
  control,
  table,
  search,
}: {
  readonly title: string;
  readonly lede?: string;
  readonly control?: ReactNode;
  readonly table: ShareTable | null;
  readonly search: string;
}) {
  if (table === null) return null;
  const rows = table.rows.filter((row) => matches(row.name, search));
  if (search !== "" && rows.length === 0) return null;
  const scale = Math.max(0, ...table.rows.flatMap((row) => [row.share, row.adjusted ?? 0]));
  const columns: DataColumn<ShareRow>[] = [
    { id: "name", label: words.columns.name, sortValue: (row) => row.name, render: (row) => row.name },
    { id: "per-run", label: words.columns.perRun, numeric: true, sortValue: (row) => row.count, render: (row) => perRun(row.perRun) },
    {
      id: "share",
      label: words.columns.share,
      numeric: true,
      sortValue: (row) => row.share,
      render: (row) => (
        <ShareBar
          share={row.share}
          scale={scale}
          text={percent(row.share)}
          {...(row.adjusted === undefined ? {} : { mark: row.adjusted })}
        />
      ),
    },
    {
      id: "seen-in",
      label: words.columns.seenIn,
      numeric: true,
      sortValue: (row) => row.seenIn,
      render: (row) => percent(row.seenIn, 0),
    },
    // Only options with a region have a catch-up ceiling: a weapon class, a rule or a talisman with no location has none
    ...(table.rows.some((row) => row.ceiling !== null)
      ? [
          {
            id: "ceiling",
            label: words.columns.ceiling,
            numeric: true,
            sortValue: (row: ShareRow) => row.ceiling ?? 0,
            render: (row: ShareRow) => (row.ceiling === null ? "–" : words.items.times(multiplier(row.ceiling))),
          },
        ]
      : []),
  ];
  return (
    <section className="simulate-section">
      <SectionHeading>{title}</SectionHeading>
      <p className="simulate-lede">
        {lede === undefined ? words.counted(perRun(table.total / table.runs)) : `${lede} ${words.counted(perRun(table.total / table.runs))}`}
      </p>
      {control}
      <DataTable
        label={title}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        fold={FOLD}
        faded={() => table.total < THIN_SAMPLE}
        initialSort="share"
        empty={words.nothing}
      />
    </section>
  );
}
