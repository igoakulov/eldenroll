import { useEffect } from "react";

/** Marks the button `Enter` or `Esc` presses: the kit's own buttons carry it, so screens declare no keys. */
export const KEY_ATTRIBUTE = "data-key";

const TYPING =
  "input:not([type='checkbox'], [type='radio'], [type='range'], [type='button']), textarea, select, [contenteditable]";
/** Focused, these keep `Enter`: a slider or checkbox included, so `Enter` there never presses the glow band. */
const CONTROL = "button, a[href], [role='tab'], summary, input";

/** The topmost marked button: in an open sheet if there is one, else on the screen, never behind something inert. */
function marked(key: "enter" | "escape", layer: ParentNode): HTMLElement | null {
  const found = [...layer.querySelectorAll<HTMLElement>(`[${KEY_ATTRIBUTE}="${key}"]`)].filter(
    (element) => element.closest("[inert]") === null,
  );
  return found.at(-1) ?? null;
}

/** `Enter` presses the topmost glow band and `Esc` the topmost way back (web/README.md#Navigation). Typing keeps
 * both keys, a focused control keeps `Enter`, and an open sheet keeps `Esc`, which closes it. */
export function useDefaultKeys(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.matches(TYPING)) {
        // `Esc` leaves the field; in a search with text it first clears it, as the browser does
        const clearing = focused instanceof HTMLInputElement && focused.type === "search" && focused.value !== "";
        if (event.key === "Escape" && !clearing) focused.blur();
        return;
      }
      const sheet = document.querySelector<HTMLElement>("[aria-modal='true']:not(.sheet-closing)");
      let target: HTMLElement | null;
      if (event.key === "Enter") {
        if (focused instanceof HTMLElement && focused.matches(CONTROL)) return;
        target = marked("enter", sheet ?? document);
      } else {
        if (sheet !== null) return;
        target = marked("escape", document);
      }
      if (target === null) return;
      event.preventDefault();
      target.click();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
