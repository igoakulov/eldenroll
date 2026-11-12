import type { ReactNode } from "react";

import { Icon } from "./Icon";
import "./ShowAll.css";

/** Opens a short list to all its rows. The chevron turns; the rows themselves fade in where they are listed. */
export function ShowAll({
  expanded,
  onToggle,
  children,
}: {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button type="button" className="show-all" aria-expanded={expanded} onClick={onToggle}>
      <Icon name="chevron" size={16} />
      <span className="show-all-label">{children}</span>
    </button>
  );
}
