import { copy } from "../copy";
import { ShareBar, type DataColumn } from "../ui/DataTable";
import { percent, perRun } from "./format";

const words = copy.sim.columns;

/** Showings per run, sorted by the count behind it, as every table counts them. */
export function perRunColumn<R extends { readonly perRun: number }>(count: (row: R) => number): DataColumn<R> {
  return { id: "per-run", label: words.perRun, numeric: true, sortValue: count, render: (row) => perRun(row.perRun) };
}

/** A share over its bar, against the table's largest. */
export function shareColumn<R extends { readonly share: number }>(scale: number): DataColumn<R> {
  return {
    id: "share",
    label: words.share,
    numeric: true,
    sortValue: (row) => row.share,
    render: (row) => <ShareBar share={row.share} scale={scale} text={percent(row.share)} />,
  };
}
