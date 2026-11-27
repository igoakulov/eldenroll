import { useState } from "react";

import { DEFAULT_STATS, MAX_STAT, MIN_STAT, correctedStat, derivedLevel } from "../engine/settings";
import type { KitBlock } from "../kit/kit";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { LevelTotal } from "./LevelTotal";
import { Stepper } from "./Stepper";

const LEVEL = derivedLevel(DEFAULT_STATS);

function LiveLevel() {
  const [vigor, setVigor] = useState(DEFAULT_STATS.vig);
  return (
    <>
      <LevelTotal level={derivedLevel({ ...DEFAULT_STATS, vig: vigor })} before={LEVEL} />
      <Stepper
        id="kit-level-vigor"
        label={STAT_NAMES.vig}
        value={vigor}
        min={MIN_STAT}
        max={MAX_STAT}
        correct={correctedStat}
        raised={vigor > DEFAULT_STATS.vig}
        onChange={setVigor}
      />
    </>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "level-total",
    title: "Level",
    section: "controls",
    size: "phone",
    states: [
      { label: "level", render: () => <LevelTotal level={LEVEL} /> },
      { label: "raised", render: () => <LevelTotal level={LEVEL + 3} before={LEVEL} /> },
      { label: "lowered", render: () => <LevelTotal level={LEVEL + 2} before={LEVEL + 3} /> },
    ],
    Live: LiveLevel,
  },
];
