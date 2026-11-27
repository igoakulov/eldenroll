import type { ReactNode } from "react";

import "./WikiLink.css";

export interface WikiLink {
  readonly name: string;
  readonly url: string;
}

/** Text that opens a wiki page in a new tab, dotted-underlined as the kit's links are; plain text without a URL. */
/** Text that scrolls its screen to the section `to` names, dotted-underlined as the kit's links are; it leaves the
 * address alone, so the app keeps no anchor to land on later. */
export function JumpText({ to, children }: { readonly to: string; readonly children: ReactNode }) {
  return (
    <a
      className="wiki-text jump-text"
      href={`#${to}`}
      onClick={(event) => {
        event.preventDefault();
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById(to)?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
      }}
    >
      {children}
    </a>
  );
}

export function WikiText({
  url,
  className,
  up = false,
  children,
}: {
  readonly url: string | null;
  readonly className: string;
  /** Its tap target reaches up and stops short of its own bottom, clear of a control just below, as the boss bar is under
   * the name. */
  readonly up?: boolean;
  readonly children: ReactNode;
}) {
  if (url === null) return <span className={className}>{children}</span>;
  return (
    <a className={`${className} wiki-text${up ? " wiki-text-up" : ""}`} href={url} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
