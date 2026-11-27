import { CountUp } from "./CountUp";
import "./StatGrid.css";

/** Stats read, not edited, in two columns, as on a run's summary. */
export function StatGrid({
  stats,
  count = false,
}: {
  readonly stats: readonly { readonly key: string; readonly label: string; readonly value: number }[];
  /** Counts each stat up as it first appears, with the run view's other numbers. */
  readonly count?: boolean;
}) {
  return (
    <dl className="stat-grid">
      {stats.map((stat) => (
        <div key={stat.key} className="stat-grid-row">
          <dt>{stat.label}</dt>
          <dd>{count ? <CountUp value={stat.value} /> : stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
