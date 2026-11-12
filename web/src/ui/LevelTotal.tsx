import { copy } from "../copy";
import "./LevelTotal.css";

/** The level over the stats. Given `before`, a changed level reads before → after, in blue when raised. */
export function LevelTotal({ level, before }: { readonly level: number; readonly before?: number }) {
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
        <span className={changed && level > before ? "raised" : undefined}>{level}</span>
      </span>
    </div>
  );
}
