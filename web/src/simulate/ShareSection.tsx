import { THIN_SAMPLE, type ShareRow, type ShareTable } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, ShareBar, type DataColumn } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { FOLD, matches, percent } from "./format";

const words = copy.simulate;

/** A section of shares: its heading, a line on what it counts, and the table, filtered by the search. */
export function ShareSection({
  title,
  lede,
  table,
  search,
}: {
  readonly title: string;
  readonly lede?: string;
  readonly table: ShareTable | null;
  readonly search: string;
}) {
  if (table === null) return null;
  const rows = table.rows.filter((row) => matches(row.name, search));
  if (search !== "" && rows.length === 0) return null;
  const scale = Math.max(0, ...table.rows.flatMap((row) => [row.share, row.adjusted ?? 0]));
  const columns: DataColumn<ShareRow>[] = [
    { id: "name", label: words.columns.name, sortValue: (row) => row.name, render: (row) => row.name },
    { id: "count", label: words.columns.objectives, numeric: true, sortValue: (row) => row.count, render: (row) => row.count },
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
  ];
  return (
    <section className="simulate-section">
      <SectionHeading>{title}</SectionHeading>
      <p className="simulate-lede">
        {lede === undefined ? words.counted(table.total) : `${lede} ${words.counted(table.total)}`}
      </p>
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
