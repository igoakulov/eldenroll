import type { ReactNode } from "react";

import "./Headings.css";

/** A section on Start and Level up: Cinzel caps and a rule fading to the right, then an optional action. */
export function SectionHeading({ children, action }: { readonly children: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      <span className="fading-rule" />
      {action}
    </div>
  );
}

/** A small text action at the end of a section heading, such as `Clear all`. */
export function HeadingAction({ children, onClick }: { readonly children: ReactNode; readonly onClick: () => void }) {
  return (
    <button type="button" className="heading-action" onClick={onClick}>
      <span>{children}</span>
    </button>
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

/** A short, faint note under a heading: what a section counts, or what a control does. */
export function SectionNote({ children }: { readonly children: ReactNode }) {
  return <p className="section-note">{children}</p>;
}

/** A section of a long page, such as the simulation's: its heading, a note on what it counts, then its body, all
 * inside the gutter but headings, which bring their own. */
export function Section({
  title,
  lede,
  children,
}: {
  readonly title?: ReactNode;
  readonly lede?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <section className="section">
      {title !== undefined && <SectionHeading>{title}</SectionHeading>}
      {lede !== undefined && <SectionNote>{lede}</SectionNote>}
      {children}
    </section>
  );
}

/** A count leading a section heading, such as `3 selected`, its digits lined up. */
export function HeadingCount({ children }: { readonly children: number }) {
  return <span className="section-heading-count">{children}</span>;
}

/** A screen's title and its lede, under the top bar; `children` go between them. */
export function ScreenHead({
  title,
  lede,
  children,
}: {
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <div className="screen-head">
      <h1 className="screen-title">{title}</h1>
      {children}
      {lede !== undefined && <p className="screen-lede">{lede}</p>}
    </div>
  );
}
