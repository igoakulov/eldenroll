import { copy } from "../copy";
import { CountUp } from "./CountUp";
import "./LevelTotal.css";

/** The level over the stats. Given `before`, a changed level reads before → after, in blue when raised. */
export function LevelTotal({
  level,
  before,
  count = false,
}: {
  readonly level: number;
  readonly before?: number;
  /** Counts up as it first appears, with the run view's other numbers. */
  readonly count?: boolean;
}) {
  const changed = before !== undefined && before !== level;
  return (
    <div className="level-total">
      <span className="level-total-key">{copy.common.level}</span>
      <span className="level-total-value">
        {changed && (
          <>
            <span className="level-total-was">{before}</span>
            <span className="level-total-arrow" aria-hidden="true">
              →
            </span>
            <span className="sr-only">{copy.controls.levelTo}</span>
          </>
        )}
        <span className={changed && level > before ? "raised" : undefined}>{count ? <CountUp value={level} /> : level}</span>
      </span>
    </div>
  );
}
