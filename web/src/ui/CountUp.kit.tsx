import { copy } from "../copy";
import { KitPad, Restarting, type KitBlock } from "../kit/kit";
import { CountUp } from "./CountUp";
import { ListRow } from "./Rows";

export const kit: readonly KitBlock[] = [
  {
    id: "count-up",
    title: "Count up",
    section: "controls",
    size: "phone",
    states: [
      {
        label: "counted",
        render: ({ runs }) => (
          <KitPad>
            <ListRow title={copy.runView.rerolls} count={<CountUp value={runs.finished.rerolls} />} />
          </KitPad>
        ),
      },
    ],
    Live: ({ kit }) => (
      <Restarting>
        {(restart) => (
          <KitPad>
            <ListRow
              title={copy.runView.objectivesCompleted}
              count={<CountUp value={kit.runs.finished.objectives.length} />}
              onClick={restart}
            />
            <ListRow title={copy.runView.rerolls} count={<CountUp value={kit.runs.finished.rerolls} />} />
          </KitPad>
        )}
      </Restarting>
    ),
    note: "Counts up once as it appears; tap the first row to count again. With reduced motion, the value shows at once.",
  },
];
