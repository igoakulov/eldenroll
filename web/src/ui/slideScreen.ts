import { flushSync } from "react-dom";

export type Slide = "open" | "close";

type Transitioning = Document & {
  readonly startViewTransition?: (update: () => void) => { readonly finished: Promise<void> };
};

let current = 0;

/** The next screen opens without a slide, so it fades in as usual. */
export function plainScreen(): void {
  delete document.documentElement.dataset.slid;
}

/** In the Home Screen app a full screen rises over the screen it opens from and falls away on `✕`, as an iOS
 * full-screen sheet does, through the browser's own view transitions (Screen.css). In the browser, with reduced
 * motion, or where view transitions don't exist, `update` simply runs and the screen keeps its fade. */
export function slideScreen(slide: Slide, update: () => void): void {
  const start = (document as Transitioning).startViewTransition;
  if (
    start === undefined ||
    !matchMedia("(display-mode: standalone)").matches ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    plainScreen();
    update();
    return;
  }
  const root = document.documentElement;
  const id = ++current;
  root.dataset.slide = slide;
  // Kept after the slide, so the screen that rose doesn't replay its own fade when the slide ends
  root.dataset.slid = "";
  void start
    .call(document, () => flushSync(update))
    .finished.finally(() => {
      if (id === current) delete root.dataset.slide;
    });
}
