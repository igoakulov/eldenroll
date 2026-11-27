import { useState } from "react";

import { copy } from "../copy";
import type { RerollTarget } from "../engine/run";
import { GlowBand } from "../ui/BottomBar";
import { Chip, Chips } from "../ui/Chips";
import { Sheet } from "../ui/Sheet";
import { StopSlider, glideAt } from "../ui/StopSlider";
import { OPENING_STOP, REROLL_STOPS } from "./rerollScope";
import "./RerollPanel.css";

const LAST = REROLL_STOPS.length - 1;

function valueText(stop: number): string {
  if (stop === 0) return copy.reroll.armorOnly;
  if (stop === LAST) return copy.reroll.fullObjective;
  return copy.reroll.rerollsFrom(REROLL_STOPS[stop]?.chip ?? "");
}

/** The reroll panel (`web/README.md#Current run`): it opens at `New class` every time. `felled` locks it at
 * `Full objective` for `Felled?`, whose chips state what follows rather than which slots change. */
export function RerollPanel({
  open,
  felled,
  onClose,
  onReroll,
  onFelled,
  opening = OPENING_STOP,
}: {
  readonly open: boolean;
  readonly felled: boolean;
  readonly onClose: () => void;
  readonly onReroll: (target: RerollTarget) => void;
  readonly onFelled: () => void;
  /** The stop it opens at, so the kit can show a scope chosen; the app leaves it at `OPENING_STOP`. */
  readonly opening?: number;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [scope, setScope] = useState({ stop: opening, from: opening, glide: false });
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setScope({ stop: opening, from: opening, glide: false });
  }
  const target = REROLL_STOPS[scope.stop]?.target ?? "boss";

  return (
    <Sheet open={open} eyebrow={felled ? copy.reroll.felledEyebrow : copy.common.reroll} onClose={onClose}>
      {felled ? (
        <Chips label={copy.reroll.felledChipsLabel}>
          <Chip lit={false} red>
            {copy.reroll.felledOnTheWay}
          </Chip>
          <Chip lit>{copy.reroll.gearUnlocked}</Chip>
          <Chip lit>{copy.reroll.newObjective}</Chip>
        </Chips>
      ) : (
        <Chips label={copy.reroll.chipsLabel} instant={!scope.glide}>
          {REROLL_STOPS.map((stop, index) => (
            <Chip key={stop.target} lit={index <= scope.stop} at={glideAt(index, scope.from, scope.stop)}>
              {stop.chip}
            </Chip>
          ))}
        </Chips>
      )}
      <StopSlider
        stops={REROLL_STOPS.length}
        value={felled ? LAST : scope.stop}
        onChange={(stop, glide) => setScope((last) => ({ stop, from: last.stop, glide }))}
        label={copy.reroll.slider}
        valueText={felled ? copy.reroll.rerollsFullObjective : valueText(scope.stop)}
        ends={[copy.reroll.armorOnly, copy.reroll.fullObjective]}
        locked={felled}
      />
      <div className="reroll-panel-action">
        {felled ? (
          <GlowBand long onClick={onFelled}>
            {copy.reroll.confirm}
          </GlowBand>
        ) : (
          <GlowBand onClick={() => onReroll(target)}>{copy.common.reroll}</GlowBand>
        )}
      </div>
    </Sheet>
  );
}
