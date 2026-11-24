import type { KitBlock } from "../kit/kit";
import { KitPad } from "../kit/kit";
import { LineChart } from "./LineChart";

const POINTS = Array.from({ length: 10 }, (_, index) => ({ x: index * 10, y: 1 / (1 - index / 10) }));
const HALF = POINTS.map((point) => ({ x: point.x, y: Math.sqrt(point.y) }));

const TENTH = POINTS.map((point) => ({ x: point.x, y: point.y / 10 + 0.5 }));

/** A sample rising line; with `baseline`, its square root beneath it; with `secondary`, a lower line beside it; with
 * `marks`, two points marked on it. */
function Chart({
  baseline = false,
  secondary = false,
  marks = false,
}: {
  readonly baseline?: boolean;
  readonly secondary?: boolean;
  readonly marks?: boolean;
}) {
  return (
    <LineChart
      title="A sample line by how much of the run is played"
      points={POINTS}
      {...(baseline ? { baseline: HALF } : {})}
      {...(secondary ? { secondary: TENTH } : {})}
      {...(marks ? { marks: [50, 70] } : {})}
      yMax={10}
      formatY={(value) => `×${value.toFixed(1)}`}
      formatX={(value) => `${value}%`}
      describe={(index) => ({
        title: `${POINTS[index]!.x}% of the run played`,
        facts: [{ label: "Boost", value: `×${POINTS[index]!.y.toFixed(2)}` }],
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
      { label: "one series", render: () => <KitPad><Chart /></KitPad> },
      { label: "with a dashed baseline", render: () => <KitPad><Chart baseline /></KitPad> },
      { label: "with a baseline and a second series", render: () => <KitPad><Chart baseline secondary /></KitPad> },
      { label: "with marks on the line", render: () => <KitPad><Chart marks /></KitPad> },
    ],
    Live: () => (
      <KitPad>
        <Chart />
      </KitPad>
    ),
    note: "A pointer over the chart shows the nearest point: a rule, a dot and a line of text under it.",
  },
];
