import { copy } from "../copy";
import { WordmarkO } from "./Icon";
import "./Wordmark.css";

/** The app's name with the lozenge for its O. While the game data loads, only the lozenge shows, pulsing, in its
 * place, so Start appears around it without the page moving. With `onHome`, it is the way back to Start. `small` fits
 * a head row beside a close button, as on the menu. */
export function Wordmark({
  loading = false,
  small = false,
  onHome,
}: {
  readonly loading?: boolean;
  readonly small?: boolean;
  readonly onHome?: () => void;
}) {
  const letters = (
    <>
      {/* not copy: the wordmark's letters around its O */}
      <span aria-hidden="true">ELDENR</span>
      <WordmarkO className="wordmark-o" />
      {/* not copy: the wordmark's letters around its O */}
      <span aria-hidden="true">LL</span>
    </>
  );
  if (onHome !== undefined) {
    return (
      <button type="button" className={`wordmark wordmark-home${small ? " wordmark-small" : ""}`} aria-label={copy.controls.toStart} onClick={onHome}>
        {letters}
      </button>
    );
  }
  const Tag = loading ? "p" : "h1";
  return (
    <Tag
      className={`wordmark${loading ? " wordmark-loading" : ""}`}
      role={loading ? "status" : undefined}
      aria-label={loading ? copy.start.loading : copy.common.appName}
    >
      {letters}
    </Tag>
  );
}
