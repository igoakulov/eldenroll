import { useState } from "react";

import type { KitBlock, KitProps } from "../kit/kit";
import { RegionCheck, byLevel } from "../views/StatsAndRegions";
import { ShowAll } from "./ShowAll";

const noop = () => {};
const SHORT_LIST = 3;

function LiveShowAll({ kit }: KitProps) {
  const regions = byLevel(kit.database.region);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<readonly string[]>([]);
  return (
    <>
      {(expanded ? regions : regions.slice(0, SHORT_LIST)).map((region, index) => (
        <RegionCheck
          key={region.id}
          region={region}
          regions={regions}
          selected={selected}
          onRegions={setSelected}
          {...(index >= SHORT_LIST ? { className: "show-all-new" } : {})}
        />
      ))}
      <ShowAll expanded={expanded} onToggle={() => setExpanded(!expanded)}>
        {expanded ? "Show fewer regions" : `Show all ${regions.length} regions`}
      </ShowAll>
    </>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "show-all",
    title: "Show all",
    section: "controls",
    size: "phone",
    states: [
      {
        label: "folded",
        render: ({ database }) => (
          <ShowAll expanded={false} onToggle={noop}>
            {`Show all ${database.region.length} regions`}
          </ShowAll>
        ),
      },
      {
        label: "open",
        render: () => (
          <ShowAll expanded onToggle={noop}>
            Show fewer regions
          </ShowAll>
        ),
      },
    ],
    Live: LiveShowAll,
  },
];
