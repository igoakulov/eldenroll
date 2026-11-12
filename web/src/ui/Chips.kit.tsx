import { useState } from "react";

import { copy } from "../copy";
import { KitPad, type KitBlock } from "../kit/kit";
import { OPENING_STOP, REROLL_STOPS } from "../views/rerollScope";
import { Chip, Chips } from "./Chips";
import { StopSlider, glideAt } from "./StopSlider";

function LiveChips() {
  const [scope, setScope] = useState({ stop: OPENING_STOP, from: OPENING_STOP, glide: false });
  return (
    <KitPad>
      <Chips label={copy.reroll.chipsLabel} instant={!scope.glide}>
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
        label={copy.reroll.slider}
        valueText={REROLL_STOPS[scope.stop]?.chip ?? ""}
        ends={[copy.reroll.armorOnly, copy.reroll.fullObjective]}
      />
    </KitPad>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "chip",
    title: "Chip",
    section: "controls",
    size: "small",
    states: [
      {
        label: "lit",
        render: () => (
          <Chips label="lit">
            <Chip lit>{copy.reroll.newObjective}</Chip>
          </Chips>
        ),
      },
      {
        label: "grey",
        render: () => (
          <Chips label="grey">
            <Chip lit={false}>{copy.reroll.chips.boss}</Chip>
          </Chips>
        ),
      },
      {
        label: "red",
        render: () => (
          <Chips label="red">
            <Chip lit={false} red>
              {copy.confirm.finishCannotResume}
            </Chip>
          </Chips>
        ),
      },
    ],
    Live: LiveChips,
    liveSize: "phone",
    note: "The live chips light as the slider's handle passes them, as on the reroll panel.",
  },
];
