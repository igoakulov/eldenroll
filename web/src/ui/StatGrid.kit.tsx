import { STATS } from "../engine/settings";
import type { KitBlock } from "../kit/kit";
import { STAT_NAMES } from "../views/StatsAndRegions";
import { StatGrid } from "./StatGrid";

export const kit: readonly KitBlock[] = [
  {
    id: "stat-grid",
    title: "Stat grid",
    note: "On the run view each stat counts up as it first appears, with the level and totals.",
    section: "groups",
    size: "phone",
    states: [
      {
        label: "a run's stats",
        render: ({ runs }) => (
          <StatGrid stats={STATS.map((stat) => ({ key: stat, label: STAT_NAMES[stat], value: runs.long.stats[stat] }))} />
        ),
      },
    ],
  },
];
