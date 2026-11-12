import type { CSSProperties, ReactNode } from "react";

import "./Chips.css";

/** Read-only chips that wrap in a row. `instant` drops their fades, for a slider being dragged. */
export function Chips({
  label,
  instant = false,
  children,
}: {
  readonly label: string;
  readonly instant?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <ul className={`chips${instant ? " chips-instant" : ""}`} aria-label={label}>
      {children}
    </ul>
  );
}

/** A chip in small caps, gold when lit, red for a boss's state. `at` delays its fade to that share of a slider's
 * glide (`glideAt`), so chips light as the handle passes them. */
export function Chip({ lit, red = false, at = 0, children }: {
  readonly lit: boolean;
  readonly red?: boolean;
  readonly at?: number;
  readonly children: ReactNode;
}) {
  return (
    <li
      className={`chip${lit ? " chip-lit" : ""}${red ? " chip-red" : ""}`}
      style={{ "--at": at } as CSSProperties}
    >
      {children}
    </li>
  );
}
