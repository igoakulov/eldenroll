import { useState } from "react";

import { copy } from "../copy";
import { DEFAULT_STATS, MAX_STAT, MIN_STAT, correctedMaxStatGap, correctedStat } from "../engine/settings";
import type { KitBlock } from "../kit/kit";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { Stepper } from "./Stepper";

const noop = () => {};

function LiveStepper() {
  const [value, setValue] = useState(DEFAULT_STATS.int);
  return (
    <Stepper
      id="kit-stepper-live"
      label={STAT_NAMES.int}
      value={value}
      min={MIN_STAT}
      max={MAX_STAT}
      correct={correctedStat}
      raised={value > DEFAULT_STATS.int}
      onChange={setValue}
    />
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "stepper",
    title: "Stepper",
    section: "controls",
    size: "phone",
    states: [
      {
        label: "a stat",
        render: () => (
          <Stepper
            id="kit-stepper-stat"
            label={STAT_NAMES.int}
            value={DEFAULT_STATS.int}
            min={MIN_STAT}
            max={MAX_STAT}
            correct={correctedStat}
            onChange={noop}
          />
        ),
      },
      {
        label: "raised",
        render: () => (
          <Stepper
            id="kit-stepper-raised"
            label={STAT_NAMES.int}
            value={MAX_STAT}
            min={MIN_STAT}
            max={MAX_STAT}
            correct={correctedStat}
            raised
            onChange={noop}
          />
        ),
      },
      {
        label: "a setting",
        render: ({ settings }) => (
          <Stepper
            id="kit-stepper-setting"
            label={copy.runSettings.maxStatGap}
            detail={copy.runSettings.maxStatGapDetail}
            value={settings.maxStatGap}
            min={0}
            max={MAX_STAT}
            correct={correctedMaxStatGap}
            onChange={noop}
          />
        ),
      },
    ],
    Live: LiveStepper,
    note: "Numbers are typed or stepped, never animated; a value typed out of range is corrected as the field loses focus.",
  },
];
