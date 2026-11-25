import type { ReactNode } from "react";

import { Icon } from "./Icon";
import "./Rows.css";

/** A framed row on Start opening another screen: its name over a line saying what it holds. */
export function FramedRow({
  title,
  detail,
  onClick,
}: {
  readonly title: ReactNode;
  readonly detail: ReactNode;
  readonly onClick?: () => void;
}) {
  return (
    <button type="button" className="framed-row" onClick={onClick}>
      <span className="framed-row-text">
        <span className="row-title">{title}</span>
        <span className="row-detail">{detail}</span>
      </span>
      <Icon name="chevron" size={20} />
    </button>
  );
}

/** A list row: an optional icon, a name over an optional detail, a value at the right, and a chevron when it opens
 * something, a search glass when it searches for its name, or nothing when it acts in place, as a search result
 * does. `cut` keeps a long name to one line. `danger` is an
 * action that cannot be undone: red, and no chevron, since it asks first rather than opening a screen. A `count` is
 * a number the row holds: rows with counts keep a chevron's room whether they open or not, so their counts line up
 * in one column. A `found` row is a search result: its name dims so the letters the search matched stand out. */
export function ListRow({
  title,
  detail,
  value,
  count,
  icon,
  opens = "screen",
  found = false,
  cut = false,
  danger = false,
  onClick,
}: {
  readonly title: ReactNode;
  readonly detail?: ReactNode;
  readonly value?: ReactNode;
  readonly count?: ReactNode;
  /** An icon file key; its 22-pixel drawing is used. */
  readonly icon?: string | null;
  readonly opens?: "screen" | "search" | "here";
  readonly found?: boolean;
  readonly cut?: boolean;
  readonly danger?: boolean;
  readonly onClick?: () => void;
}) {
  const className = `list-row${cut ? " list-row-cut" : ""}${danger ? " list-row-danger" : ""}${found ? " list-row-found" : ""}`;
  const trail = onClick === undefined || danger || opens === "here" ? null : opens === "search" ? "search" : "chevron";
  const content = (
    <>
      {icon !== undefined && (
        <span className="list-row-icon">{icon !== null && <Icon name={`${icon}-22`} size={22} />}</span>
      )}
      <span className="list-row-text">
        <span className="row-title">{title}</span>
        {detail !== undefined && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="list-row-value">{value}</span>}
      {count !== undefined && <span className="list-row-count">{count}</span>}
      {trail !== null ? (
        <Icon name={trail} size={20} />
      ) : (
        count !== undefined && <span className="list-row-trail" aria-hidden="true" />
      )}
    </>
  );
  return onClick === undefined ? (
    <div className={className}>{content}</div>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

/** A setting whose control is too wide to sit beside its name, such as a `Cycler`: the name above it, a rule on top. */
export function ControlRow({ label, children }: { readonly label: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="control-row">
      <span className="row-title">{label}</span>
      {children}
    </div>
  );
}
