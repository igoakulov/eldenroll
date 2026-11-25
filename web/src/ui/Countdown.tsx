import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import "./Countdown.css";

/** Counts down from `from` seconds and calls `onZero` as the count runs out. `skip` takes exactly a second off,
 * whenever it comes. `left` is the digit shown, the whole seconds left rounded up; `remaining` is the time left in ms
 * when it last changed, which places the ring. */
export function useCountdown(
  from: number,
  onZero: () => void,
): { readonly left: number; readonly remaining: number; readonly skip: () => void } {
  const deadline = useRef<number | null>(null);
  deadline.current ??= performance.now() + from * 1000;
  const [at, setAt] = useState({ left: from, remaining: from * 1000 });
  const zero = useRef(onZero);
  useEffect(() => {
    zero.current = onZero;
  });
  // A tap on the last second and the timer may both end the count; it ends once
  const ended = useRef(false);
  const update = () => {
    const remaining = (deadline.current ?? 0) - performance.now();
    if (remaining > 0) setAt({ left: Math.ceil(remaining / 1000), remaining });
    else if (!ended.current) {
      ended.current = true;
      zero.current();
    }
  };
  useEffect(() => {
    // Wakes when the digit next changes
    const timer = window.setTimeout(update, at.remaining - (at.left - 1) * 1000);
    return () => window.clearTimeout(timer);
  }, [at]);
  return {
    ...at,
    skip: () => {
      deadline.current = (deadline.current ?? 0) - 1000;
      update();
    },
  };
}

interface Trail {
  readonly id: number;
  /** Drained shares of the ring, 0 whole to 1 empty. */
  readonly from: number;
  readonly to: number;
  /** How long it holds before draining, in ms; `null` holds the full `--trail-at`. */
  readonly hold: number | null;
}

/** The trail's hold before it drains, the boss bar's `--trail-at`. */
function holdMs(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--trail-at")) || 0;
}

const SIZE = 112;
const CENTRE = SIZE / 2;
// The band's middle radius: a band of 6 between two rims of 1, inside the dial
const RADIUS = 51.5;

/** A label over a digit, the old digit fading out before the new one fades in, inside a ring drawn as a gold boss
 * bar; 0 never shows. Every change of `remaining`, a second passing or a skip, lands like a hit on the bar: the gold
 * drops at once, and the trail holds where it was, then drains to meet it. */
export function Countdown({
  from,
  left,
  remaining,
  label,
}: {
  readonly from: number;
  readonly left: number;
  readonly remaining: number;
  readonly label: string;
}) {
  const gradient = useId();
  const drained = Math.min(1, Math.max(0, 1 - remaining / (from * 1000)));
  const seen = useRef(drained);
  const [trail, setTrail] = useState<Trail>({ id: 0, from: 0, to: 0, hold: null });
  const trailElement = useRef<SVGCircleElement>(null);
  // Before the gold's drop is painted, the trail is placed where the old one stands. A trail still moving carries on
  // from there, and its hold isn't started again: quick hits stack into one trail that keeps draining, rather than
  // one that never starts
  useLayoutEffect(() => {
    if (seen.current === drained) return;
    seen.current = drained;
    const element = trailElement.current;
    const running = element?.getAnimations().find((one) => one.playState === "running");
    const at = element !== null && running !== undefined ? parseFloat(getComputedStyle(element).strokeDashoffset) : NaN;
    const elapsed = Number(running?.currentTime ?? 0);
    setTrail((last) => ({
      id: last.id + 1,
      from: Number.isFinite(at) ? at : last.to,
      to: drained,
      hold: running === undefined ? null : Math.max(0, (last.hold ?? holdMs()) - elapsed),
    }));
  }, [drained]);

  const ticked = left < from;
  const band = { cx: CENTRE, cy: CENTRE, r: RADIUS, pathLength: 1 };
  return (
    <div className="countdown" role="timer" aria-live="off">
      <p className="countdown-label">{label}</p>
      <div className="countdown-dial">
        <svg className="countdown-ring" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <defs>
            <radialGradient id={gradient} gradientUnits="userSpaceOnUse" cx={CENTRE} cy={CENTRE} r={RADIUS + 3}>
              <stop offset={(RADIUS - 3) / (RADIUS + 3)} className="countdown-ring-inner" />
              <stop offset={RADIUS / (RADIUS + 3)} className="countdown-ring-middle" />
              <stop offset={1} className="countdown-ring-outer" />
            </radialGradient>
          </defs>
          <circle className="countdown-ring-track" {...band} />
          <circle
            key={trail.id}
            ref={trailElement}
            className="countdown-ring-trail"
            {...band}
            style={
              {
                "--trail-from": trail.from,
                "--trail-to": trail.to,
                ...(trail.hold === null ? {} : { animationDelay: `${trail.hold}ms` }),
                // Already draining: it goes on at speed rather than easing in again
                ...(trail.hold === 0 ? { animationTimingFunction: "var(--ease-out)" } : {}),
              } as CSSProperties
            }
          />
          <circle
            className="countdown-ring-gold"
            {...band}
            style={{
              stroke: `url(#${CSS.escape(gradient)})`,
              strokeDashoffset: drained,
              // Whole, it is one unbroken circle: the dash's two ends would meet at the top as a hairline seam
              ...(drained === 0 ? { strokeDasharray: "none" } : {}),
            }}
          />
          <circle className="countdown-ring-rim" cx={CENTRE} cy={CENTRE} r={RADIUS + 3.5} />
          <circle className="countdown-ring-rim" cx={CENTRE} cy={CENTRE} r={RADIUS - 3.5} />
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
