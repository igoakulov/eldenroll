import type { ReactNode } from "react";

import { Icon } from "./Icon";
import "./LozengeCheckbox.css";

/** A checkbox row: a lozenge that fills and glows, like a grace being lit. `icons` follow the name, dimmer while
 * unchecked; a `lead` icon goes before it instead. A `framed` one stands alone between two rules, at a name's size. A search `result`'s name dims until ticked, so the letters it
 * matched stand out (`SearchMatch`). */
export function LozengeCheckbox({
  checked,
  onChange,
  children,
  tag,
  icons,
  lead,
  framed = false,
  result = false,
  className,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
  readonly tag?: string;
  readonly icons?: readonly string[];
  readonly lead?: ReactNode;
  readonly framed?: boolean;
  readonly result?: boolean;
  readonly className?: string;
}) {
  const modifier =
    (icons === undefined ? "" : " lozenge-row-icons") +
    (lead === undefined ? "" : " lozenge-row-lead") +
    (framed ? " lozenge-row-framed" : "") +
    (result ? " lozenge-row-result" : "");
  return (
    <label className={`lozenge-row${modifier}${className === undefined ? "" : ` ${className}`}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="lozenge-box" aria-hidden="true" />
      {lead !== undefined && (
        <span className="lozenge-lead" aria-hidden="true">
          {lead}
        </span>
      )}
      <span className="lozenge-label">{children}</span>
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
