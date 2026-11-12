import { useState } from "react";

import type { RerollTarget } from "../engine/run";
import { GlowBand } from "../ui/BottomBar";
import { Chip, Chips } from "../ui/Chips";
import { Sheet } from "../ui/Sheet";
import { StopSlider, glideAt } from "../ui/StopSlider";
import { OPENING_STOP, REROLL_STOPS } from "./rerollScope";
import "./RerollPanel.css";

const LAST = REROLL_STOPS.length - 1;

function valueText(stop: number): string {
  if (stop === 0) return "Armor only";
  if (stop === LAST) return "Full objective";
  return `Rerolls from ${REROLL_STOPS[stop]?.chip ?? ""}`;
}

/** The reroll panel (`web/README.md#Current run`): it opens at `New class` every time. */
export function RerollPanel({
  open,
  onClose,
  onReroll,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onReroll: (target: RerollTarget) => void;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [scope, setScope] = useState({ stop: OPENING_STOP, from: OPENING_STOP, glide: false });
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setScope({ stop: OPENING_STOP, from: OPENING_STOP, glide: false });
  }
  const target = REROLL_STOPS[scope.stop]?.target ?? "boss";

  return (
    <Sheet open={open} eyebrow="Reroll" onClose={onClose}>
      <Chips label="Lit slots will change" instant={!scope.glide}>
        {REROLL_STOPS.map((stop, index) => (
          <Chip key={stop.target} lit={index <= scope.stop} at={glideAt(index, scope.from, scope.stop)}>
            {stop.chip}
          </Chip>
        ))}
      </Chips>
      <StopSlider
        stops={REROLL_STOPS.length}
        value={scope.stop}
        onChange={(stop, glide) => setScope((last) => ({ stop, from: last.stop, glide }))}
        label="Reroll scope"
        valueText={valueText(scope.stop)}
        ends={["Armor only", "Full objective"]}
      />
      <div className="reroll-panel-action">
        <GlowBand onClick={() => onReroll(target)}>Reroll</GlowBand>
      </div>
    </Sheet>
  );
}
