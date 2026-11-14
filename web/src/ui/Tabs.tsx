import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import "./Tabs.css";

/** Tabs over their panels, one per tab. Every panel is laid out in one stack and only the selected one shows, so the
 * page is as tall as its tallest tab and choosing another never moves what is above the panels. The arrow keys,
 * `Home` and `End` move between tabs and select as they go; the gold underline glides to the new tab and the panel
 * fades in. */
export function Tabs({
  label,
  tabs,
  selected,
  onSelect,
  panels,
  bar,
}: {
  readonly label: string;
  readonly tabs: readonly string[];
  readonly selected: number;
  readonly onSelect: (index: number) => void;
  readonly panels: readonly ReactNode[];
  /** Wraps the tab row, such as in a sticky header with more controls; the panels stay where they are. */
  readonly bar?: (tabs: ReactNode) => ReactNode;
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement | null>(null);
  const last = tabs.length - 1;
  // A label wider than its share of the row widens its column, so the underline follows the selected tab as laid out
  const [underline, setUnderline] = useState<{ readonly left: number; readonly width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const tab = buttons.current[selected];
      if (tab) setUnderline({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    measure();
    if (list.current === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list.current);
    return () => observer.disconnect();
  }, [selected, tabs.length]);

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Readonly<Record<string, number>> = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(next);
    buttons.current[next]?.focus();
  };

  const row = (
    <div
      ref={list}
      className="tabs"
      role="tablist"
      aria-label={label}
      style={
        {
          "--tabs": tabs.length,
          "--tab": selected,
          ...(underline === null ? {} : { "--underline-x": `${underline.left}px`, "--underline-w": `${underline.width}px` }),
        } as CSSProperties
      }
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          type="button"
          className="tab"
          role="tab"
          id={`${id}-tab-${index}`}
          aria-selected={index === selected}
          aria-controls={`${id}-panel-${index}`}
          tabIndex={index === selected ? 0 : -1}
          onClick={() => onSelect(index)}
        >
          {tab}
        </button>
      ))}
      <span className="tabs-underline" aria-hidden="true" />
    </div>
  );
  return (
    <>
      {bar === undefined ? row : bar(row)}
      <div className="tab-panels">
        {tabs.map((tab, index) => (
          <div
            key={tab}
            className={`tab-panel${index === selected ? " tab-panel-selected" : ""}`}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
          >
            {panels[index]}
          </div>
        ))}
      </div>
    </>
  );
}
