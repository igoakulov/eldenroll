import { useEffect, useRef, useState } from "react";

function still(): boolean {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function countMs(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-count")) || 0;
}

/** A number that counts up from zero once, as it first appears, easing to a stop like the tokens' `--ease-out`
 * (web/src/ui/README.md#Sequences). Every count that appears together starts and ends together. With reduced motion,
 * and on any later change, it shows its value at once. */
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
    started.current ??= performance.now();
    const start = started.current;
    const duration = countMs();
    let frame = 0;
    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else finished.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}
