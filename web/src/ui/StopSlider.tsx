import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

import "./StopSlider.css";

/** The share of a glide from stop `from` to stop `to` at which the handle passes stop `index`, so what hangs on
 * the slider can change as the handle passes, not all at once. */
export function glideAt(index: number, from: number, to: number): number {
  return from === to ? 0 : Math.min(1, Math.abs(index - from) / Math.abs(to - from));
}

/** The drawn rail's inset from each end of the track, in px */
const INSET = 16;

/** A slider of a few stops: a real range input, invisible, for the keyboard and assistive tech, under a drawn
 * rail, fill, stops and handle. Pointers are handled here rather than by the input, because iOS lets a range
 * input move only by dragging its thumb. A tap or a key glides the handle to its stop; a drag follows the finger
 * with no lag. `onChange` says which. A `locked` slider is drawn dimmed at its value and can't move or take focus. */
export function StopSlider({
  stops,
  value,
  onChange,
  label,
  valueText,
  ends,
  locked = false,
}: {
  readonly stops: number;
  readonly value: number;
  readonly onChange: (value: number, glide: boolean) => void;
  readonly label: string;
  readonly valueText: string;
  readonly ends: readonly [string, string];
  readonly locked?: boolean;
}) {
  const last = stops - 1;
  const [motion, setMotion] = useState({ from: value, glide: false });
  const dragging = useRef(false);

  const pick = (next: number, glide: boolean) => {
    if (next === value) return;
    setMotion({ from: value, glide });
    onChange(next, glide);
  };

  // The stop under the pointer, found by the browser's own hit testing: each stop owns an invisible zone reaching
  // halfway to its neighbours. Measuring boxes against the pointer breaks under the desktop frame's CSS `zoom` in
  // Safari, which reports the two in different scales. Off the track, the value stays.
  const stopAt = (event: PointerEvent<HTMLDivElement>) => {
    const zone = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element instanceof HTMLElement && element.dataset.stop !== undefined);
    return zone instanceof HTMLElement ? Number(zone.dataset.stop) : value;
  };

  const at = (index: number) => `calc(${INSET}px + (100% - ${2 * INSET}px) * ${index / last})`;
  const half = `(100% - ${2 * INSET}px) / ${2 * last}`;

  return (
    <div className={`stop-slider${locked ? " stop-slider-locked" : motion.glide ? " stop-slider-glide" : ""}`}>
      <div
        className="stop-slider-track"
        onPointerDown={(event) => {
          if (locked || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragging.current = true;
          pick(stopAt(event), true);
        }}
        onPointerMove={(event) => {
          if (dragging.current) pick(stopAt(event), false);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <span className="stop-slider-rail" />
        <span
          className="stop-slider-fill"
          style={{ width: `calc((100% - ${2 * INSET}px) * ${value / last})` }}
        />
        {Array.from({ length: stops }, (_, index) => (
          <span
            key={index}
            className={`stop-slider-stop${index < value ? " stop-slider-stop-in" : ""}`}
            style={{ left: at(index), "--at": glideAt(index, motion.from, value) } as CSSProperties}
          />
        ))}
        <span className="stop-slider-thumb" style={{ left: at(value) }} />
        {Array.from({ length: stops }, (_, index) => (
          <span
            key={index}
            className="stop-slider-zone"
            data-stop={index}
            style={{
              left: index === 0 ? 0 : `calc(${at(index)} - ${half})`,
              right: index === last ? 0 : `calc(100% - ${at(index)} - ${half})`,
            }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={value}
          aria-label={label}
          aria-valuetext={valueText}
          disabled={locked}
          onChange={(event) => pick(Number(event.target.value), true)}
        />
      </div>
      <div className="stop-slider-ends" aria-hidden="true">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}
