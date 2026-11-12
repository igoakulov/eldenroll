import type { ReactNode } from "react";

import "./LozengeCheckbox.css";

/** A checkbox row: a lozenge that fills and glows, like a grace being lit. */
export function LozengeCheckbox({
  checked,
  onChange,
  children,
  tag,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
  readonly tag?: string;
}) {
  return (
    <label className="lozenge-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="lozenge-box" aria-hidden="true" />
      <span className="lozenge-label">{children}</span>
      {tag !== undefined && <span className="lozenge-tag">{tag}</span>}
    </label>
  );
}
