import { useState, type CSSProperties, type ReactNode } from "react";

import "./DataTable.css";

export interface DataColumn<R> {
  readonly id: string;
  readonly label: string;
  /** Numbers sit at the end of their cell, lined up. */
  readonly numeric?: boolean;
  /** Absent for a column that doesn't sort. */
  readonly sortValue?: (row: R) => number | string;
  readonly render: (row: R) => ReactNode;
}

/** A table of figures: a column heading in small caps sorts by its column, numbers first from the largest, names
 * A to Z; a second tap turns the order around. A `faded` row counts too few objectives to read as more than
 * noise. A table wider than the screen scrolls sideways inside its own frame, never the page. */
export function DataTable<R>({
  label,
  columns,
  rows,
  rowKey,
  faded,
  initialSort,
  empty,
}: {
  readonly label: string;
  readonly columns: readonly DataColumn<R>[];
  readonly rows: readonly R[];
  readonly rowKey: (row: R) => string;
  readonly faded?: (row: R) => boolean;
  /** A column id; rows keep their given order without one. */
  readonly initialSort?: string;
  /** What shows in place of an empty table. */
  readonly empty?: string;
}) {
  const [sort, setSort] = useState<{ readonly id: string; readonly reversed: boolean } | null>(
    initialSort === undefined ? null : { id: initialSort, reversed: false },
  );
  const column = columns.find((one) => one.id === sort?.id);
  const sorted =
    column?.sortValue === undefined
      ? rows
      : [...rows].sort((a, b) => {
          const x = column.sortValue!(a);
          const y = column.sortValue!(b);
          const order = typeof x === "number" && typeof y === "number" ? byNumber(x, y) : String(x).localeCompare(String(y));
          return sort?.reversed === true ? -order : order;
        });
  const direction = (one: DataColumn<R>): "ascending" | "descending" | undefined => {
    if (sort?.id !== one.id) return undefined;
    const largestFirst = one.numeric === true;
    return largestFirst !== sort.reversed ? "descending" : "ascending";
  };

  if (rows.length === 0 && empty !== undefined) return <p className="data-table-empty">{empty}</p>;
  return (
    <div className="data-table-frame">
      <table className="data-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((one) => (
              <th
                key={one.id}
                scope="col"
                className={one.numeric === true ? "data-table-numeric" : undefined}
                aria-sort={direction(one)}
              >
                {one.sortValue === undefined ? (
                  one.label
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setSort((last) => ({ id: one.id, reversed: last?.id === one.id ? !last.reversed : false }))
                    }
                  >
                    {one.label}
                    <span className="data-table-sort" aria-hidden="true">
                      {direction(one) === "ascending" ? "▴" : direction(one) === "descending" ? "▾" : ""}
                    </span>
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={faded?.(row) === true ? "data-table-faded" : undefined}>
              {columns.map((one) => (
                <td key={one.id} className={one.numeric === true ? "data-table-numeric" : undefined}>
                  {one.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Largest first; a value that isn't a number, such as a mean of nothing, sorts last, and equal ends tie. */
function byNumber(x: number, y: number): number {
  const at = (value: number) => (Number.isNaN(value) ? -Infinity : value);
  return at(x) === at(y) ? 0 : at(y) > at(x) ? 1 : -1;
}

/** A share as a number over a rail: the fill is the share, against the table's largest; `mark`, where given, is a
 * second share on the same scale, drawn as a tick, such as what pool size alone would give. */
export function ShareBar({
  share,
  scale,
  text,
  mark,
}: {
  readonly share: number;
  /** The share that fills the rail, usually the table's largest. */
  readonly scale: number;
  readonly text: string;
  readonly mark?: number;
}) {
  const at = (value: number) => (scale > 0 ? Math.min(1, value / scale) : 0);
  return (
    <span className="share-bar">
      <span className="share-bar-text">{text}</span>
      <span
        className="share-bar-rail"
        aria-hidden="true"
        style={{ "--fill": at(share), "--mark": at(mark ?? 0) } as CSSProperties}
      >
        <span className="share-bar-fill" />
        {mark !== undefined && <span className="share-bar-mark" />}
      </span>
    </span>
  );
}
