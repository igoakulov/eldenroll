import { useEffect, useRef, useState } from "react";

function still(): boolean {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tokenMs(name: string): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

/** A number that counts up from zero once, as it first appears (web/src/ui/README.md#Sequences): it waits out the
 * screen's fade, which would hide the start, then eases in and out, so the count is seen climbing rather than over
 * at once. Every count that appears together starts and ends together. With reduced motion, and on any later change,
 * it shows its value at once. */
export function CountUp({ value }: { readonly value: number }) {
  const [shown, setShown] = useState(() => (still() ? value : 0));
  // Kept across effect reruns, so a remounted effect carries on rather than starting over
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  useEffect(() => {
    if (finished.current || still()) {
      finished.current = true;
      setShown(value);
      return;
    }
    started.current ??= performance.now() + tokenMs("--dur-sheet");
    const start = started.current;
    const duration = tokenMs("--dur-count");
    let frame = 0;
    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
      setShown(Math.round(value * t * t * (3 - 2 * t)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else finished.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}
