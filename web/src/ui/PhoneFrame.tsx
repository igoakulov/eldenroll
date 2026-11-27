import { useLayoutEffect, useRef, type ReactNode } from "react";

import { WordmarkO } from "./Icon";
import "./PhoneFrame.css";

// The drawn phone with its bezel and band (PhoneFrame.css), and the page's margin above and below it
const DEVICE_HEIGHT = 902;
const PAGE_MARGIN = 16;
// Below this the page scrolls instead, so browser zoom still enlarges the text
const MIN_SCALE = 0.7;
const LINE_PX = 40;
const NUDGES = ["--phone-nudge-x", "--phone-nudge-y"];

/** On a wide window the app runs inside a drawn phone, scaled to the window's height (`web/README.md#Desktop`); a
 * phone-sized window gets the app alone. Only CSS tells the two apart: the screen is a scroll container only in
 * the frame. */
export function PhoneFrame({ children }: { readonly children: ReactNode }) {
  const screen = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    // How far the phone moves to put the screen's corner on a whole device pixel: Safari draws the screen snapped to
    // one while its content scrolls and unsnapped while it fits, so the content jumped a pixel when a tab or a
    // timeline entry changed its height
    const snap = (at: number) => (Math.round(at * devicePixelRatio) - at * devicePixelRatio) / devicePixelRatio;
    const fit = () => {
      const scale = Math.max(MIN_SCALE, (root.clientHeight - 2 * PAGE_MARGIN) / DEVICE_HEIGHT);
      root.style.setProperty("--phone-scale", String(scale));
      for (const name of NUDGES) root.style.removeProperty(name);
      const box = screen.current?.getBoundingClientRect();
      if (box === undefined) return;
      root.style.setProperty("--phone-nudge-x", `${snap(box.left + scrollX)}px`);
      root.style.setProperty("--phone-nudge-y", `${snap(box.top + scrollY)}px`);
    };
    // A window moved to a display of another density
    let density: MediaQueryList | null = null;
    const watch = () => {
      density?.removeEventListener("change", refit);
      density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      density.addEventListener("change", refit);
    };
    const refit = () => {
      fit();
      watch();
    };
    refit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      density?.removeEventListener("change", refit);
      for (const name of ["--phone-scale", ...NUDGES]) root.style.removeProperty(name);
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
