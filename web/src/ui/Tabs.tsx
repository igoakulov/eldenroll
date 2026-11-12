import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

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
}: {
  readonly label: string;
  readonly tabs: readonly string[];
  readonly selected: number;
  readonly onSelect: (index: number) => void;
  readonly panels: readonly ReactNode[];
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const last = tabs.length - 1;

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

  return (
    <>
      <div
        className="tabs"
        role="tablist"
        aria-label={label}
        style={{ "--tabs": tabs.length, "--tab": selected } as CSSProperties}
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
