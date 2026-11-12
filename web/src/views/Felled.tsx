import { useEffect, useRef, useState, type ReactNode } from "react";

import { copy } from "../copy";
import { Countdown } from "../ui/Countdown";
import { Screen } from "../ui/Screen";
import { UndoButton } from "../ui/UndoButton";
import "./Felled.css";

/** The one big moment (web/src/ui/README.md#Sequences): over the dimmed card, `behind`, the boss's bar drains and
 * `Great enemy felled` holds while `label` counts down to `onZero`. A tap anywhere ends the entrance, never the
 * count. */
export function Felled({
  bossName,
  label,
  behind,
  onZero,
  onUndo,
}: {
  readonly bossName: string;
  readonly label: string;
  readonly behind: ReactNode;
  readonly onZero: () => void;
  readonly onUndo: () => void;
}) {
  const [settled, setSettled] = useState(false);
  // The control that opened this is gone with the card, so the keyboard lands on `Undo`
  const undo = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    undo.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Screen className={`felled${settled ? " felled-settled" : ""}`} onPointerDown={() => setSettled(true)}>
      <div className="felled-behind" inert aria-hidden="true">
        {behind}
      </div>
      <div className="felled-veil" aria-hidden="true" />
      <div className="felled-stage">
        <div className="felled-boss">
          <p className="felled-name">{bossName}</p>
          <div className="felled-bar" aria-hidden="true">
            <i className="felled-trail" />
            <i className="felled-fill" />
          </div>
        </div>
        <div className="felled-main">
          <div className="felled-band" role="status">
            <h1>
              {copy.felled.title[0]}
              <br />
              {copy.felled.title[1]}
            </h1>
          </div>
          <Countdown from={5} label={label} onZero={onZero} />
        </div>
        <UndoButton ref={undo} onClick={onUndo} />
      </div>
    </Screen>
  );
}
