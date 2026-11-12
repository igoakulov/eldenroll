import { useEffect, useRef, useState } from "react";

import "./Countdown.css";

/** A label over a digit counting down a second at a time, the old digit fading out as the new one fades in, inside
 * a ring that empties over the whole count. Calls `onZero` as the count runs out, without showing 0. */
export function Countdown({
  from,
  label,
  onZero,
}: {
  readonly from: number;
  readonly label: string;
  readonly onZero: () => void;
}) {
  const [left, setLeft] = useState(from);
  const zero = useRef(onZero);
  useEffect(() => {
    zero.current = onZero;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (left <= 1) zero.current();
      else setLeft(left - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  const ticked = left < from;
  return (
    <div className="countdown" role="timer" aria-live="off">
      <p className="countdown-label">{label}</p>
      <div className="countdown-dial">
        <svg className="countdown-ring" viewBox="0 0 112 112" aria-hidden="true">
          <circle className="countdown-ring-track" cx="56" cy="56" r="54.5" />
          <circle
            className="countdown-ring-left"
            cx="56"
            cy="56"
            r="54.5"
            pathLength={1}
            style={{ animationDuration: `${from}s` }}
          />
        </svg>
        <b className="countdown-digits">
          {ticked && (
            <span key={`old-${left}`} className="countdown-old" aria-hidden="true">
              {left + 1}
            </span>
          )}
          <span key={left} className={ticked ? "countdown-new" : undefined}>
            {left}
          </span>
        </b>
      </div>
    </div>
  );
}
