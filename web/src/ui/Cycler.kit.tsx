import { useState } from "react";

import type { BossState } from "../engine/run";
import type { KitBlock, KitProps } from "../kit/kit";
import { BOSS_STATES } from "../views/Bosses";
import { Cycler } from "./Cycler";

const noop = () => {};

function LiveCycler({ kit }: KitProps) {
  const [state, setState] = useState<BossState>("alive");
  return (
    <div className="kit-cycler">
      <Cycler label={kit.samples.boss.name} options={BOSS_STATES} value={state} onChange={setState} />
    </div>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "cycler",
    title: "Cycler",
    section: "controls",
    size: "small",
    states: BOSS_STATES.map((state) => ({
      label: state.label,
      render: ({ samples }) => (
        <div className="kit-cycler">
          <Cycler label={samples.boss.name} options={BOSS_STATES} value={state.value} onChange={noop} />
        </div>
      ),
    })),
    Live: LiveCycler,
  },
];
