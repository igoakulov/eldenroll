import type { ReactNode } from "react";

import { Icon } from "./Icon";
import "./LozengeCheckbox.css";

/** A checkbox row: a lozenge that fills and glows, like a grace being lit. `icons` follow the name, dimmer while
 * unchecked. */
export function LozengeCheckbox({
  checked,
  onChange,
  children,
  tag,
  icons,
  className,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
  readonly tag?: string;
  readonly icons?: readonly string[];
  readonly className?: string;
}) {
  const modifier = icons === undefined ? "" : " lozenge-row-icons";
  return (
    <label className={`lozenge-row${modifier}${className === undefined ? "" : ` ${className}`}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="lozenge-box" aria-hidden="true" />
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
