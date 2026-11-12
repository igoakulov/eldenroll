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

/** A list row: a name over an optional detail, a value at the right, and a chevron when it opens something. `cut`
 * keeps a long name to one line. `danger` is an action that cannot be undone: red, and no chevron, since it asks
 * first rather than opening a screen. */
export function ListRow({
  title,
  detail,
  value,
  cut = false,
  danger = false,
  onClick,
}: {
  readonly title: ReactNode;
  readonly detail?: ReactNode;
  readonly value?: ReactNode;
  readonly cut?: boolean;
  readonly danger?: boolean;
  readonly onClick?: () => void;
}) {
  const className = `list-row${cut ? " list-row-cut" : ""}${danger ? " list-row-danger" : ""}`;
  const content = (
    <>
      <span className="list-row-text">
        <span className="row-title">{title}</span>
        {detail !== undefined && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="list-row-value">{value}</span>}
      {onClick !== undefined && !danger && <Icon name="chevron" size={20} />}
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
