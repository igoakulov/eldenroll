import { useLayoutEffect, useRef, type ReactNode } from "react";

import { WordmarkO } from "./Icon";
import "./PhoneFrame.css";

// The drawn phone with its bezel and band (PhoneFrame.css), and the page's margin above and below it
const DEVICE_HEIGHT = 902;
const PAGE_MARGIN = 16;
// Below this the page scrolls instead, so browser zoom still enlarges the text
const MIN_SCALE = 0.7;
const LINE_PX = 40;

/** On a wide window the app runs inside a drawn phone, scaled to the window's height (`web/README.md#Desktop`); a
 * phone-sized window gets the app alone. Only CSS tells the two apart: the screen is a scroll container only in
 * the frame. */
export function PhoneFrame({ children }: { readonly children: ReactNode }) {
  const screen = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const height = document.documentElement.clientHeight;
      const scale = Math.max(MIN_SCALE, (height - 2 * PAGE_MARGIN) / DEVICE_HEIGHT);
      document.documentElement.style.setProperty("--phone-scale", String(scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.documentElement.style.removeProperty("--phone-scale");
    };
  }, []);

  useLayoutEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const scroller = screen.current;
      const page = document.documentElement;
      if (scroller === null || event.ctrlKey || !(event.target instanceof Node)) return;
      if (scroller.contains(event.target) || scroller.scrollHeight <= scroller.clientHeight) return;
      // When the page itself scrolls, below the minimum scale, the wheel beside the phone scrolls the page
      if (page.scrollHeight > page.clientHeight) return;
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? LINE_PX
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? scroller.clientHeight
            : 1;
      scroller.scrollBy({ top: event.deltaY * unit, behavior: "instant" });
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="phone-frame">
      <div className="phone-frame-side phone-frame-left" aria-hidden="true">
        {/* not copy: the wordmark's letters */}
        <p className="phone-frame-mark">ELDEN</p>
      </div>
      <div className="phone-frame-device">
        <span className="phone-frame-bezel" aria-hidden="true" />
        <span className="phone-frame-hole" aria-hidden="true" />
        <div ref={screen} className="phone-frame-screen">
          <div className="phone-frame-content">{children}</div>
        </div>
      </div>
      <div className="phone-frame-side phone-frame-right" aria-hidden="true">
        <p className="phone-frame-mark">
          {/* not copy: the wordmark's letters around its O */}
          R<WordmarkO className="phone-frame-o" />LL
        </p>
      </div>
    </div>
  );
}
