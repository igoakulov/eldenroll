import type { ReactNode } from "react";

import { copy } from "../copy";
import { Icon, Lozenge } from "./Icon";
import "./TopBar.css";
import { KEY_ATTRIBUTE } from "./keys";

/** `mark` takes the lozenge and eyebrow's place, as the wordmark does on a screen that belongs to no run; the eyebrow
 * then only names the screen for screen readers. */
export function TopBar({
  eyebrow,
  mark,
  children,
}: {
  readonly eyebrow: ReactNode;
  readonly mark?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <header className="top-bar">
      {mark === undefined ? (
        <div className="top-bar-left">
          <span className="top-bar-glyph">
            <Lozenge />
          </span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
      ) : (
        <div className="top-bar-left">
          <span className="sr-only">{eyebrow}</span>
          <span className="top-bar-mark">{mark}</span>
        </div>
      )}
      <div className="top-bar-right">{children}</div>
    </header>
  );
}

/** A square framed icon button, 30px drawn with a 44px touch area. */
export function FramedIconButton({
  icon,
  label,
  onClick,
}: {
  readonly icon: string;
  readonly label: string;
  readonly onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="framed-icon"
      aria-label={label}
      // A close button is the screen's way back, so `Esc` presses it (`keys.ts`)
      {...(icon === "close" ? { [KEY_ATTRIBUTE]: "escape" } : {})}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export function LevelButton({ level, onClick }: { readonly level: number; readonly onClick?: () => void }) {
  return (
    <button type="button" className="level-button" aria-label={copy.controls.levelButton(level)} onClick={onClick}>
      <span>{copy.common.level}</span>
      {level}
    </button>
  );
}
