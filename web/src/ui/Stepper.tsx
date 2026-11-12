import { useState } from "react";

import "./Stepper.css";

/** A number field between `−` and `+`. `correct` turns what was typed into an accepted value. */
export function Stepper({
  id,
  label,
  value,
  min,
  max,
  correct,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly correct: (entered: string, previous: number) => number;
  readonly onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) onChange(correct(draft, value));
    setDraft(null);
  };
  return (
    <div className="stepper-row">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        <button type="button" aria-label={`Lower ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <button type="button" aria-label={`Raise ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}
