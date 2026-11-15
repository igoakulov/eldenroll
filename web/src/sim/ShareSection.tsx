import type { ReactNode } from "react";

import { THIN_SAMPLE, vsFair, type ShareRow, type ShareTable } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, type DataColumn } from "../ui/DataTable";
import { perRunColumn, shareColumn } from "./columns";
import { Section } from "../ui/Headings";
import { decimal, FOLD, matches, multiplier, percent, perRun, rowName } from "./format";

const words = copy.sim;


/** A section of shares: its heading, a line on what it counts, a `control` such as a switch of how it counts, and
 * the table, filtered by the search. */
export function ShareSection({
  title,
  lede,
  control,
  table,
  search,
  nameLabel = words.columns.name,
}: {
  readonly title: string;
  /** The first column's heading, such as Region for a table by region. */
  readonly nameLabel?: string;
  readonly lede?: string;
  readonly control?: ReactNode;
  readonly table: ShareTable | null;
  readonly search: string;
}) {
  if (table === null) return null;
  const rows = table.rows.filter((row) => matches(rowName(row), search));
  const counted = (table.unit === "showings" ? words.countedShowings : words.counted)(perRun(table.total / table.runs));
  if (search !== "" && rows.length === 0) return null;
  const scale = Math.max(0, ...table.rows.map((row) => row.share));
  const columns: DataColumn<ShareRow>[] = [
    {
      id: "name",
      label: nameLabel,
      // Names sort A to Z; a region's by its number, padded so 10 follows 9
      sortValue: (row) => (row.order === undefined ? row.name : String(row.order).padStart(3, "0")),
      render: (row) => rowName(row),
    },
    perRunColumn((row) => row.count),
    shareColumn(scale),
    // Only tables with a share from pool size alone, by weapon class or by region, say how far each row is from it
    ...(table.rows.some((row) => row.adjusted !== undefined)
      ? [
          {
            id: "fair",
            label: words.columns.fair,
            numeric: true,
            sortValue: (row: ShareRow) => vsFair(row),
            render: (row: ShareRow) => decimal(vsFair(row)),
          },
        ]
      : []),
    {
      id: "seen-in",
      label: words.columns.seenIn,
      numeric: true,
      sortValue: (row) => row.seenIn,
      render: (row) => percent(row.seenIn, 0),
    },
    // Rules and classes never get a catch-up boost, so their tables leave the column out
    ...(table.rows.some((row) => row.boost !== null)
      ? [
          {
            id: "catch-up",
            label: words.columns.catchUp,
            numeric: true,
            sortValue: (row: ShareRow) => row.boost ?? 0,
            render: (row: ShareRow) => (row.boost === null ? "–" : words.items.times(multiplier(row.boost))),
          },
        ]
      : []),
  ];
  return (
    <Section title={title} lede={lede === undefined ? counted : `${lede} ${counted}`}>
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
    </Section>
  );
}
