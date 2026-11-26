import { copy } from "../copy";
import "./BossBar.css";

/** The boss bar, broken near its right end by `Felled?`. As the boss arrives a whole bar fills over it, then gives
 * way as `Felled?` fades into the gap (web/src/ui/README.md#Sequences). */
export function BossBar({ onFelled }: { readonly onFelled: () => void }) {
  return (
    <div className="boss-bar">
      <div className="boss-bar-whole" aria-hidden="true">
        <i />
      </div>
      <div className="boss-bar-half boss-bar-left" aria-hidden="true">
        <i />
      </div>
      <button type="button" className="boss-bar-felled" onClick={onFelled}>
        <span className="boss-bar-word">{copy.card.felled}</span>?
      </button>
      <div className="boss-bar-half boss-bar-right" aria-hidden="true">
        <i />
      </div>
    </div>
  );
}
