import { useEffect, useRef, type ReactNode } from "react";

import { copy } from "../copy";
import { Countdown, useCountdown } from "../ui/Countdown";
import { Screen } from "../ui/Screen";
import { UndoButton } from "../ui/UndoButton";
import "./Felled.css";

const COUNT = 5;

/** The one big moment (web/src/ui/README.md#Sequences): over the dimmed card, `behind`, the boss's bar drains and
 * `Great enemy felled` holds while `label` counts down to `onZero`. A tap on the words or the countdown takes a second
 * off; the area is wider than the dial, so a finger beside it leaves the digit in sight. */
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
  const { left, remaining, skip } = useCountdown(COUNT, onZero);
  // The control that opened this is gone with the card, so the keyboard lands on the stage, not on `Undo`: an
  // `Enter` pressed again after `Done` would undo it
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stage.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Screen className="felled">
      <div className="felled-behind" inert aria-hidden="true">
        {behind}
      </div>
      <div className="felled-veil" aria-hidden="true" />
      <div ref={stage} className="felled-stage" tabIndex={-1}>
        <div className="felled-boss">
          <p className="felled-name">{bossName}</p>
          <div className="felled-bar" aria-hidden="true">
            <i className="felled-trail" />
            <i className="felled-fill" />
          </div>
        </div>
        <div className="felled-main">
          <div className="felled-hurry">
            <div className="felled-band" role="status">
              <h1>
                {copy.felled.title[0]}
                <br />
                {copy.felled.title[1]}
              </h1>
            </div>
            <Countdown from={COUNT} left={left} remaining={remaining} label={label} />
            <button type="button" className="felled-hurry-button" aria-label={copy.felled.skipSecond} onClick={skip} />
          </div>
        </div>
        <UndoButton onClick={onUndo} />
      </div>
    </Screen>
  );
}
