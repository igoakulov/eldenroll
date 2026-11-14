import { catchUpBoost } from "../engine/hyperparams";
import type { KitBlock } from "../kit/kit";
import type { KitData } from "../kit/kitData";
import { KitPad } from "../kit/kit";
import { LineChart } from "./LineChart";

/** The catch-up boost's ceiling region by region, at `strength`: the engine's own curve. */
function boostByRegion({ database }: KitData, strength: number) {
  const regions = [...database.region].sort((a, b) => a.region_level - b.region_level);
  return regions.map((row) => ({
    region: row,
    point: { x: row.region_level, y: catchUpBoost(row.run_left, { strength }) },
  }));
}

/** The boost at strength 1; with `baseline`, strength 0.5 beneath it. */
/** With `marks`, the DLC regions' levels marked on the line. */
function Chart({ kit, baseline = false, marks = false }: { readonly kit: KitData; readonly baseline?: boolean; readonly marks?: boolean }) {
  const rows = boostByRegion(kit, 1);
  const half = boostByRegion(kit, 0.5);
  return (
    <LineChart
      title="Catch-up boost by region level"
      points={rows.map((row) => row.point)}
      {...(baseline ? { baseline: half.map((row) => row.point) } : {})}
      {...(marks ? { marks: rows.filter((row) => row.region.id.startsWith("dlc_")).map((row) => row.point.x) } : {})}
      yMax={Math.ceil(Math.max(...rows.map((row) => row.point.y)))}
      formatY={(value) => `×${value.toFixed(1)}`}
      formatX={String}
      describe={(index) => ({
        title: rows[index]!.region.name,
        facts: [
          { label: "Region level", value: String(rows[index]!.region.region_level) },
          { label: "Boost", value: `×${rows[index]!.point.y.toFixed(2)}` },
        ],
      })}
    />
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "line-chart",
    title: "Line chart",
    section: "simulation",
    size: "phone",
    states: [
      { label: "one series", render: (kit) => <KitPad><Chart kit={kit} /></KitPad> },
      { label: "with a faint baseline", render: (kit) => <KitPad><Chart kit={kit} baseline /></KitPad> },
      { label: "with marks on the line", render: (kit) => <KitPad><Chart kit={kit} marks /></KitPad> },
    ],
    Live: ({ kit }) => (
      <KitPad>
        <Chart kit={kit} />
      </KitPad>
    ),
    note: "A pointer over the chart shows the nearest point: a rule, a dot and a line of text under it.",
  },
];
