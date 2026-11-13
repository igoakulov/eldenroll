import { copy } from "../copy";
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
        render: () => <FramedRow title={copy.common.runSettings} detail={copy.common.runSettingsDetail} onClick={noop} />,
      },
      {
        label: "opening a screen",
        render: () => (
          <div className="kit-pad">
            <ListRow title={copy.common.howItWorks} detail={copy.menu.howItWorksDetail} onClick={noop} />
          </div>
        ),
      },
      {
        label: "red",
        render: () => (
          <div className="kit-pad">
            <ListRow title={copy.common.finishRun} detail={copy.menu.finishRunDetail} danger onClick={noop} />
          </div>
        ),
      },
      {
        label: "read only, cut to one line",
        render: ({ runs, samples }) => (
          <div className="kit-pad">
            <ListRow title={copy.common.runTitle(objectiveNumber(runs.progressed), samples.boss.name)} detail={copy.start.inProgress} cut />
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
        <FramedRow title={copy.common.runSettings} detail={copy.common.runSettingsDetail} onClick={noop} />
        <div className="kit-pad">
          <ListRow title={copy.common.runSettings} detail={copy.common.runSettingsDetail} onClick={noop} />
          <ListRow title={copy.common.finishRun} detail={copy.menu.finishRunDetail} danger onClick={noop} />
        </div>
      </>
    ),
    note: "On desktop, hover brightens a framed row's frame.",
  },
  {
    id: "row-verdict",
    title: "Row with a verdict",
    section: "simulation",
    size: "phone",
    states: [
      {
        label: "pass, then fail",
        render: ({ samples }) => (
          <div className="kit-pad">
            <ListRow title={samples.talisman.name} value="99.6% of 270" verdict="pass" />
            <ListRow title={samples.rule.name} detail={`Lost to ${samples.armorSet.name} 5.9%`} value="94.1% of 17" verdict="fail" />
          </div>
        ),
      },
    ],
  },
];
