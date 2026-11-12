import type { ReactNode } from "react";

import "./WikiLink.css";

export interface WikiLink {
  readonly name: string;
  readonly url: string;
}

/** Text that opens a wiki page in a new tab, dotted-underlined as the kit's links are; plain text without a URL. */
export function WikiText({
  url,
  className,
  children,
}: {
  readonly url: string | null;
  readonly className: string;
  readonly children: ReactNode;
}) {
  if (url === null) return <span className={className}>{children}</span>;
  return (
    <a className={`${className} wiki-text`} href={url} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
