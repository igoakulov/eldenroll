import { useState } from "react";

import { KitPad, type KitBlock } from "../kit/kit";
import { OPENING_STOP, REROLL_STOPS } from "../views/rerollScope";
import { StopSlider } from "./StopSlider";

const noop = () => {};
const LAST = REROLL_STOPS.length - 1;
const ENDS = ["Armor only", "Full objective"] as const;

function at(stop: number, locked = false) {
  return (
    <KitPad>
      <StopSlider
        stops={REROLL_STOPS.length}
        value={stop}
        onChange={noop}
        label="Reroll scope"
        valueText={REROLL_STOPS[stop]?.chip ?? ""}
        ends={ENDS}
        locked={locked}
      />
    </KitPad>
  );
}

function LiveSlider() {
  const [stop, setStop] = useState(OPENING_STOP);
  return (
    <KitPad>
      <StopSlider
        stops={REROLL_STOPS.length}
        value={stop}
        onChange={setStop}
        label="Reroll scope"
        valueText={REROLL_STOPS[stop]?.chip ?? ""}
        ends={ENDS}
      />
    </KitPad>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "stop-slider",
    title: "Stop slider",
    section: "controls",
    size: "phone",
    states: [
      { label: "first stop", render: () => at(0) },
      { label: "as the reroll panel opens", render: () => at(OPENING_STOP) },
      { label: "last stop", render: () => at(LAST) },
      { label: "locked", render: () => at(LAST, true) },
    ],
    Live: LiveSlider,
    note: "A tap or a key glides the handle to its stop; a drag follows the finger with no lag.",
  },
];
