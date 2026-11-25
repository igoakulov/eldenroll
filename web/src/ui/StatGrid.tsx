import "./StatGrid.css";

/** Stats read, not edited, in two columns, as on a run's summary. */
export function StatGrid({
  stats,
}: {
  readonly stats: readonly { readonly key: string; readonly label: string; readonly value: number }[];
}) {
  return (
    <dl className="stat-grid">
      {stats.map((stat) => (
        <div key={stat.key} className="stat-grid-row">
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
