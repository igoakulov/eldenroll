import type { CSSProperties, ReactNode } from "react";

import { Icon } from "./Icon";
import "./BottomBar.css";

/** The bottom bar: one glow band, or a ruled button beside it at equal width. */
export function BottomBar({
  children,
  notice,
  className,
  style,
}: {
  readonly children: ReactNode;
  /** A line above the buttons, such as why a run can't start. */
  readonly notice?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  return (
    <div className={`bottom-bar${className === undefined ? "" : ` ${className}`}`} style={style}>
      {notice !== undefined && (
        <p className="bottom-bar-notice" role="alert">
          {notice}
        </p>
      )}
      <div className="bottom-bar-row">{children}</div>
    </div>
  );
}

/** The main action: a band of warm light between two gold rules. One per screen. */
export function GlowBand({ children, onClick }: { readonly children: ReactNode; readonly onClick?: () => void }) {
  return (
    <button type="button" className="glow-band" onClick={onClick}>
      {children}
    </button>
  );
}

/** A secondary action beside the glow band: the band's two rules, dimmed, never a box. */
export function RuledButton({
  children,
  icon,
  onClick,
}: {
  readonly children: ReactNode;
  readonly icon?: string;
  readonly onClick?: () => void;
}) {
  return (
    <button type="button" className="ruled-button" onClick={onClick}>
      {icon !== undefined && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
