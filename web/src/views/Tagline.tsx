import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  FIRST_TYPING,
  TAGLINE_LINK,
  TAGLINES,
  lineBreak,
  nextTyping,
  readMs,
  splitTyped,
  typingDelay,
  type Typing,
} from "./typing";

const MAIN = TAGLINES[0] ?? "";
/** Two lines whenever a variant is longer than the main tagline, so the space below never changes. */
const LINES = TAGLINES.some((tagline) => tagline.length > MAIN.length) ? 2 : 1;

function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface Layout {
  /** The main tagline's width on one line, which every first line shares. */
  readonly width: number;
  /** Per variant, where its second line starts, or `null` on one line. */
  readonly breaks: readonly (number | null)[];
}

/** The CSS zoom an element is drawn at: the desktop phone frame scales the app with `zoom`, and a measured box
 * comes back scaled, while a width set in CSS gets scaled again. */
function zoomOf(element: Element): number {
  return (element as Element & { readonly currentCSSZoom?: number }).currentCSSZoom ?? 1;
}

/** Measures the main tagline and breaks every other variant where its first line would outgrow it. */
function measure(probe: HTMLElement): Layout {
  const zoom = zoomOf(probe);
  const widthOf = (line: string) => {
    probe.textContent = line.trimEnd();
    return probe.getBoundingClientRect().width / zoom;
  };
  const width = widthOf(MAIN);
  const breaks = TAGLINES.map((tagline, index) =>
    index === 0 ? null : lineBreak(tagline, (line) => widthOf(line) <= width),
  );
  return { width, breaks };
}

/** Types each variant behind a thin caret, holds it, deletes it and types the next, in a loop. Every first line
 * starts where the main tagline does, which is centred; a second line is centred under it. The untyped rest is
 * laid out in transparent ink, so no line shifts while it types. */
export function Tagline({ onOpen }: { readonly onOpen: () => void }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<Typing>(FIRST_TYPING);
  const [layout, setLayout] = useState<Layout | null>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    void document.fonts.ready.then(() => {
      if (probe.current !== null) setLayout(measure(probe.current));
    });
  }, []);

  // A second line wider than the screen would wrap to a third; say so while writing variants
  useEffect(() => {
    if (!import.meta.env.DEV || layout === null || box.current === null) return;
    const lineHeight = parseFloat(getComputedStyle(box.current).lineHeight);
    for (const line of box.current.querySelectorAll<HTMLElement>(".tagline-line")) {
      if (line.getBoundingClientRect().height / zoomOf(line) > lineHeight * 1.5) {
        console.warn(`A tagline line wraps; shorten it: "${line.textContent}"`);
      }
    }
  }, [layout, state.variant]);

  useEffect(() => {
    if (reduced) {
      const timer = window.setTimeout(
        () => setState((s) => ({ variant: (s.variant + 1) % TAGLINES.length, shown: 0, phase: "holding" })),
        readMs(TAGLINES[state.variant] ?? ""),
      );
      return () => window.clearTimeout(timer);
    }
    const delay = typingDelay(state, TAGLINES, Math.random());
    const timer = window.setTimeout(() => setState((s) => nextTyping(s, TAGLINES)), delay);
    return () => window.clearTimeout(timer);
  }, [state, reduced]);

  const text = TAGLINES[state.variant] ?? "";
  const shown = reduced ? text.length : state.shown;
  const breakAt = layout?.breaks[state.variant] ?? null;
  const caretLine = breakAt === null || shown <= breakAt ? 0 : 1;
  const ranges: readonly (readonly [number, number])[] =
    breakAt === null ? [[0, text.length]] : [[0, breakAt], [breakAt, text.length]];
  const linkStart = text.indexOf(TAGLINE_LINK);
  const caretIn = shown <= linkStart ? "before" : shown <= linkStart + TAGLINE_LINK.length ? "link" : "after";

  const line = ([from, to]: readonly [number, number], index: number) => {
    const { before, link, after } = splitTyped(text, shown, from, to);
    const caret = (where: typeof caretIn) =>
      !reduced && index === caretLine && caretIn === where && <span className="tagline-caret" aria-hidden="true" />;
    return (
      <span key={index} className={`tagline-line tagline-line-${index + 1}`}>
        {before.typed}
        {caret("before")}
        <span className="tagline-rest">{before.rest}</span>
        {link.typed.length + link.rest.length > 0 && (
          // A link rather than a button: a button lays out as one block, which lets the line break between
          // `Elden Rold` and the full stop after it
          <a
            className="tagline-link"
            href="#elden-rold"
            onClick={(event) => {
              event.preventDefault();
              onOpen();
            }}
          >
            <span className="tagline-link-typed">{link.typed}</span>
            {caret("link")}
            <span className="tagline-rest">{link.rest}</span>
          </a>
        )}
        {after.typed}
        {caret("after")}
        <span className="tagline-rest">{after.rest}</span>
      </span>
    );
  };

  return (
    <p
      className="tagline"
      ref={box}
      style={{ "--lines": LINES, "--first-line": layout === null ? "100%" : `${layout.width}px` } as CSSProperties}
    >
      <span className="tagline-probe" ref={probe} aria-hidden="true" />
      <span className="tagline-typed" key={reduced ? state.variant : "typed"}>
        {ranges.map(line)}
      </span>
    </p>
  );
}
