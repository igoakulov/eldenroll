import { useState } from "react";

import { Icon } from "./Icon";
import "./Cycler.css";

/** Steps through a few states in a loop: previous and next around the word, which also steps on. The word shifts a
 * few pixels the way it stepped. */
export function Cycler<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** What is being set, such as a boss's name. */
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  const [step, setStep] = useState<{ readonly way: "back" | "on"; readonly id: number } | null>(null);
  const index = options.findIndex((option) => option.value === value);
  const word = options[index]?.label ?? value;
  const go = (way: "back" | "on") => {
    const next = options[(index + (way === "on" ? 1 : options.length - 1)) % options.length];
    if (next === undefined) return;
    setStep((last) => ({ way, id: (last?.id ?? 0) + 1 }));
    onChange(next.value);
  };
  return (
    <div className="cycler" role="group" aria-label={`${label}: ${word}`}>
      <button type="button" className="cycler-back" aria-label="Previous state" onClick={() => go("back")}>
        <Icon name="chevron" size={14} />
      </button>
      <button type="button" className="cycler-word" aria-label="Next state" onClick={() => go("on")}>
        <span key={step?.id ?? 0} className={step === null ? undefined : `cycler-stepped-${step.way}`}>
          {word}
        </span>
      </button>
      <button type="button" aria-label="Next state" onClick={() => go("on")}>
        <Icon name="chevron" size={14} />
      </button>
    </div>
  );
}
