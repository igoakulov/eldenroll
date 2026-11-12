import type { ReactNode } from "react";

import { Icon } from "./Icon";
import "./LozengeCheckbox.css";

/** A checkbox row: a lozenge that fills and glows, like a grace being lit. `icons` follow the name, dimmer while
 * unchecked; a `lead` icon goes before it instead. A setting carries a `detail` line under its name. */
export function LozengeCheckbox({
  checked,
  onChange,
  children,
  detail,
  tag,
  icons,
  lead,
  className,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
  readonly detail?: ReactNode;
  readonly tag?: string;
  readonly icons?: readonly string[];
  readonly lead?: ReactNode;
  readonly className?: string;
}) {
  const modifier =
    (icons === undefined ? "" : " lozenge-row-icons") +
    (lead === undefined ? "" : " lozenge-row-lead") +
    (detail === undefined ? "" : " lozenge-row-detail");
  return (
    <label className={`lozenge-row${modifier}${className === undefined ? "" : ` ${className}`}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="lozenge-box" aria-hidden="true" />
      {lead !== undefined && (
        <span className="lozenge-lead" aria-hidden="true">
          {lead}
        </span>
      )}
      {detail === undefined ? (
        <span className="lozenge-label">{children}</span>
      ) : (
        <span className="lozenge-label">
          <span className="lozenge-name">{children}</span>
          <span className="lozenge-detail">{detail}</span>
        </span>
      )}
      {icons !== undefined && (
        <span className="lozenge-icons" aria-hidden="true">
          {icons.map((icon, index) => (
            <Icon key={index} name={icon} size={22} />
          ))}
        </span>
      )}
      {tag !== undefined && <span className="lozenge-tag">{tag}</span>}
    </label>
  );
}
