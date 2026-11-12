import type { ReactNode } from "react";

import "./Headings.css";

/** A section on Start and Level up: Cinzel caps and a rule fading to the right. */
export function SectionHeading({ children }: { readonly children: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      <span className="fading-rule" />
    </div>
  );
}

/** A slot group on the card: small caps and a fainter fading rule. */
export function SlotHeading({ children }: { readonly children: ReactNode }) {
  return (
    <div className="slot-heading">
      <h3>{children}</h3>
    </div>
  );
}

/** A screen's title and its lede, under the top bar. */
export function ScreenHead({ title, children }: { readonly title: ReactNode; readonly children?: ReactNode }) {
  return (
    <div className="screen-head">
      <h1 className="screen-title">{title}</h1>
      {children}
    </div>
  );
}
