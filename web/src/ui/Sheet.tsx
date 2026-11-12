import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icon } from "./Icon";
import "./Sheet.css";
import "./TopBar.css";

const FOCUSABLE = "button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/** Wraps `Tab` around the sheet's controls, so focus never reaches the dimmed screen. */
function trapTab(event: KeyboardEvent, sheet: HTMLElement) {
  const focusable = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first === undefined || last === undefined) return;
  const active = document.activeElement;
  const inside = active instanceof Node && sheet.contains(active);
  if (event.shiftKey && (!inside || active === first || active === sheet)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first.focus();
  }
}

/** A sheet over the dimmed screen: an eyebrow and a close button over its content. It holds the keyboard while
 * open (`web/README.md#Navigation`) and stays drawn while it fades out. Place it with `Screen`'s `sheet`, so it
 * sizes to the screen rather than the window. `alert` marks a confirmation. */
export function Sheet({
  open,
  eyebrow,
  alert = false,
  closeLabel = "Cancel",
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly eyebrow: string;
  readonly alert?: boolean;
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) setDrawn(true);

  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const titleId = useId();

  useEffect(() => {
    const sheet = ref.current;
    if (!open || sheet === null) return;
    const opener = document.activeElement;
    sheet.focus({ preventScroll: true });

    // Everything beside the sheet in its screen stops taking focus and clicks until it closes
    const scrim = sheet.parentElement?.previousElementSibling;
    const behind = [...(sheet.parentElement?.parentElement?.children ?? [])].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== sheet.parentElement && element !== scrim,
    );
    for (const element of behind) element.inert = true;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      } else if (event.key === "Tab") {
        trapTab(event, sheet);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      for (const element of behind) element.inert = false;
      if (opener instanceof HTMLElement && opener.isConnected && !sheet.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!drawn) return null;
  const state = open ? "" : " sheet-closing";
  return (
    <>
      <div className={`sheet-scrim${state}`} aria-hidden="true" onClick={onClose} />
      <div className="sheet-dock">
        <div
          ref={ref}
          className={`sheet${state}`}
          role={alert ? "alertdialog" : "dialog"}
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onAnimationEnd={(event) => {
            if (!open && event.target === event.currentTarget) setDrawn(false);
          }}
        >
          <div className="sheet-head">
            <p className="eyebrow" id={titleId}>
              {eyebrow}
            </p>
            <button type="button" className="sheet-close" aria-label={closeLabel} onClick={onClose}>
              <Icon name="close" size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
