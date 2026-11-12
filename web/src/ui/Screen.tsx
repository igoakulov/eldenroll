import { useLayoutEffect, useRef, type ReactNode } from "react";

import "./Screen.css";

/** Every screen is a top part, its sections and a bottom bar, sized to its container rather than the window,
 * so the desktop phone frame can wrap it unchanged. A screen opens at its top, whatever scrolls it: the window on a
 * phone, the frame on desktop. `mist` places the teal light: centred on Start, left elsewhere. `sheet` takes a
 * `Sheet`, which needs to sit after the bottom bar. */
export function Screen({
  mist = "left",
  className,
  bottom,
  sheet,
  children,
  onPointerDown,
}: {
  readonly mist?: "centre" | "left";
  readonly className?: string;
  readonly bottom?: ReactNode;
  readonly sheet?: ReactNode;
  readonly children: ReactNode;
  readonly onPointerDown?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  return (
    <div
      ref={ref}
      className={`screen mist-${mist}${className === undefined ? "" : ` ${className}`}`}
      onPointerDown={onPointerDown}
    >
      <div className="screen-body">{children}</div>
      {bottom}
      {sheet}
    </div>
  );
}
