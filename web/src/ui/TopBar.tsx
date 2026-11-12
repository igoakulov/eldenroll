import type { ReactNode } from "react";

import { copy } from "../copy";
import { Icon, Lozenge } from "./Icon";
import "./TopBar.css";

export function TopBar({ eyebrow, children }: { readonly eyebrow: ReactNode; readonly children?: ReactNode }) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="top-bar-glyph">
          <Lozenge />
        </span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
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
    <button type="button" className="framed-icon" aria-label={label} onClick={onClick}>
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
