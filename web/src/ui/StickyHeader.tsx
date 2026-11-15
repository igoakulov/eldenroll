import type { ReactNode } from "react";

import { useHideOnScroll } from "./useHideOnScroll";
import "./StickyHeader.css";

/** Stuck to the top of a long page: out of the way while it scrolls down, back in view on any scroll up. A page
 * that dresses it, such as the UI kit's with its mist, passes a `className`. */
export function StickyHeader({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  const hidden = useHideOnScroll();
  return (
    <header className={["sticky-header", hidden ? "sticky-header-hidden" : "", className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </header>
  );
}
