import { objectiveNumber } from "../engine/run";
import type { KitBlock } from "../kit/kit";
import { FramedRow, ListRow } from "./Rows";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "rows",
    title: "Rows",
    section: "groups",
    size: "phone",
    states: [
      {
        label: "framed",
        render: () => <FramedRow title="Run settings" detail="Classes, never roll, shortlist, bosses" onClick={noop} />,
      },
      {
        label: "opening a screen",
        render: () => (
          <div className="kit-pad">
            <ListRow title="How it works" detail="What a run asks of you, and keeping it on your phone" onClick={noop} />
          </div>
        ),
      },
      {
        label: "red",
        render: () => (
          <div className="kit-pad">
            <ListRow title="Finish run" detail="Ends this run and shows its summary" danger onClick={noop} />
          </div>
        ),
      },
      {
        label: "read only, cut to one line",
        render: ({ runs, samples }) => (
          <div className="kit-pad">
            <ListRow title={`Objective ${objectiveNumber(runs.progressed)}, ${samples.boss.name}`} detail="In progress" cut />
          </div>
        ),
      },
      {
        label: "a value",
        render: ({ runs }) => (
          <div className="kit-pad">
            <ListRow title="Bosses felled" value={runs.progressed.deadBosses.length} onClick={noop} />
          </div>
        ),
      },
    ],
    Live: () => (
      <>
        <FramedRow title="Run settings" detail="Classes, never roll, shortlist, bosses" onClick={noop} />
        <div className="kit-pad">
          <ListRow title="Run settings" detail="Classes, never roll, shortlist, bosses" onClick={noop} />
          <ListRow title="Finish run" detail="Ends this run and shows its summary" danger onClick={noop} />
        </div>
      </>
    ),
    note: "On desktop, hover brightens a framed row's frame.",
  },
];
