import { DEFAULT_HYPERPARAMS, lateBoost } from "../engine/hyperparams";
import type { KitBlock } from "../kit/kit";
import type { KitData } from "../kit/kitData";
import { KitPad } from "../kit/kit";
import { LineChart } from "./LineChart";

/** The lateness boost of an item with no stat requirement, region by region: the engine's own curve. */
function boostByRegion({ database }: KitData, demand: number) {
  const regions = [...database.region].sort((a, b) => a.region_level - b.region_level);
  const top = Math.max(...regions.map((row) => row.region_level));
  return regions.map((row) => ({
    region: row,
    point: { x: row.region_level, y: lateBoost((row.region_level - 1) / (top - 1), demand, DEFAULT_HYPERPARAMS.lateOffset) },
  }));
}

/** The boost with no stat requirement; with `baseline`, the most demanding item's beneath it. */
/** With `marks`, the DLC regions' levels marked on the line. */
function Chart({ kit, baseline = false, marks = false }: { readonly kit: KitData; readonly baseline?: boolean; readonly marks?: boolean }) {
  const rows = boostByRegion(kit, 0);
  const most = boostByRegion(kit, 1);
  return (
    <LineChart
      title="Lateness boost by region level"
      points={rows.map((row) => row.point)}
      {...(baseline ? { baseline: most.map((row) => row.point) } : {})}
      {...(marks ? { marks: rows.filter((row) => row.region.id.startsWith("dlc_")).map((row) => row.point.x) } : {})}
      yMax={Math.ceil(Math.max(...(baseline ? most : rows).map((row) => row.point.y)))}
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
