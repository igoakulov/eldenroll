import { copy } from "../copy";
import { WordmarkO } from "./Icon";
import "./Wordmark.css";

/** The app's name with the lozenge for its O. While the game data loads, only the lozenge shows, pulsing, in its
 * place, so Start appears around it without the page moving. With `onHome`, it is the way back to Start. */
export function Wordmark({ loading = false, onHome }: { readonly loading?: boolean; readonly onHome?: () => void }) {
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
      <button type="button" className="wordmark wordmark-home" aria-label={copy.controls.toStart} onClick={onHome}>
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
