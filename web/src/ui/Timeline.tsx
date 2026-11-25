import type { ReactNode } from "react";

import { Icon } from "./Icon";
import { RuleLozenge } from "./RuleLozenge";
import "./Timeline.css";

/** A run's timeline, oldest first: a thin line down the left joins each entry's lozenge. */
export function Timeline({ children }: { readonly children: ReactNode }) {
  return <ol className="timeline">{children}</ol>;
}

/** One entry: an eyebrow over its names and a line under them. An objective, marked by a filled lozenge, opens to
 * its detail; bosses felled on the way, marked hollow, don't. `hit` is what matched a search, shown while closed. */
export function TimelineEntry({
  eyebrow,
  names,
  line,
  hit,
  open = false,
  onToggle,
  children,
}: {
  readonly eyebrow: ReactNode;
  readonly names: readonly ReactNode[];
  readonly line?: ReactNode;
  readonly hit?: { readonly label: ReactNode; readonly value: ReactNode };
  readonly open?: boolean;
  /** Without it, the entry is hollow and doesn't open. */
  readonly onToggle?: () => void;
  readonly children?: ReactNode;
}) {
  const head = (
    <>
      <span className="timeline-marker" />
      <span className="timeline-text">
        <span className="timeline-eyebrow">{eyebrow}</span>
        {names.map((name, index) => (
          <span key={index} className="timeline-name">
            {name}
          </span>
        ))}
        {line !== undefined && <span className="timeline-line">{line}</span>}
        {hit !== undefined && !open && (
          <span className="timeline-hit">
            <span className="timeline-label">{hit.label}</span>
            <span className="timeline-hit-value">{hit.value}</span>
          </span>
        )}
      </span>
      {onToggle !== undefined && <Icon name="chevron" size={16} />}
    </>
  );
  return (
    <li className={`timeline-entry${onToggle === undefined ? " timeline-entry-hollow" : ""}`}>
      {onToggle === undefined ? (
        <div className="timeline-head">{head}</div>
      ) : (
        <button type="button" className="timeline-head" aria-expanded={open} onClick={onToggle}>
          {head}
        </button>
      )}
      {open && <div className="timeline-detail">{children}</div>}
    </li>
  );
}

/** One part of an open entry: an icon, or the red lozenge for a combat rule, beside its label over its values. */
export function TimelineRow({
  icon,
  rule = false,
  label,
  children,
}: {
  /** An icon file key; its 22-pixel drawing is used. */
  readonly icon?: string | null;
  readonly rule?: boolean;
  readonly label: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="timeline-row">
      <span className="timeline-row-icon">
        {rule ? <RuleLozenge /> : icon !== undefined && icon !== null && <Icon name={`${icon}-22`} size={22} />}
      </span>
      <span className="timeline-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/** A value in an open entry: what the slot holds, a line under it in italics (an ash of war), or a quieter note (an
 * armor set's pieces, the stats); `none` and `any` as the card shows them. `matched` is what a search picked, in
 * gold. */
export function TimelineValue({
  kind = "value",
  matched = false,
  children,
}: {
  readonly kind?: "value" | "under" | "note" | "none" | "any";
  readonly matched?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span className={`timeline-value timeline-value-${kind}${matched ? " timeline-value-matched" : ""}`}>{children}</span>
  );
}

/** Numbers under short labels, four to a line, as the stats at `Done`. */
export function TimelineStats({
  stats,
}: {
  readonly stats: readonly { readonly key: string; readonly label: string; readonly value: number }[];
}) {
  return (
    <dl className="timeline-stats">
      {stats.map((stat) => (
        <div key={stat.key}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
