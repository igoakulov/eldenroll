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

/** A list row: a name over an optional detail, a value at the right, and a chevron when it opens something. */
export function ListRow({
  title,
  detail,
  value,
  onClick,
}: {
  readonly title: ReactNode;
  readonly detail?: ReactNode;
  readonly value?: ReactNode;
  readonly onClick?: () => void;
}) {
  const content = (
    <>
      <span className="list-row-text">
        <span className="row-title">{title}</span>
        {detail !== undefined && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="list-row-value">{value}</span>}
      {onClick !== undefined && <Icon name="chevron" size={20} />}
    </>
  );
  return onClick === undefined ? (
    <div className="list-row">{content}</div>
  ) : (
    <button type="button" className="list-row" onClick={onClick}>
      {content}
    </button>
  );
}
