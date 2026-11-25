import { useState } from "react";

import { copy } from "../copy";
import { objectiveNumber } from "../engine/run";
import type { KitBlock } from "../kit/kit";
import { iconKey } from "../views/icons";
import { Cycler } from "./Cycler";
import { SearchMatch } from "./SearchField";
import { ControlRow, FramedRow, ListRow } from "./Rows";

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
      {
        label: "counts, opening or not, in one column",
        render: ({ runs }) => (
          <div className="kit-pad">
            <ListRow title={copy.runView.bossesFelled} count={runs.finished.deadBosses.length} />
            <ListRow title={copy.runView.bossesSkipped} count={runs.finished.skippedBosses.length} onClick={noop} />
            <ListRow title={copy.runView.rerolls} detail={copy.runView.rerolledKinds.armor_set} count={runs.finished.rerolls} />
          </div>
        ),
      },
      {
        label: "an icon, searching for its name",
        render: ({ samples }) => (
          <div className="kit-pad">
            <ListRow icon={iconKey(samples.weapon)} title={samples.weapon.name} opens="search" onClick={noop} />
            <ListRow
              icon={iconKey(samples.weapon)}
              title={<SearchMatch name={samples.weapon.name} match={[0, 4]} />}
              opens="search"
              found
              onClick={noop}
            />
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
    id: "control-row",
    title: "Control row",
    section: "simulation",
    size: "phone",
    states: [{ label: "a cycler", render: () => <AllocationRow /> }],
    Live: AllocationRow,
  },
];

type Focus = "STR" | "DEX";

function AllocationRow() {
  const words = copy.sim;
  const [focus, setFocus] = useState<Focus>("STR");
  return (
    <ControlRow label={words.allocation}>
      <Cycler<Focus>
        label={words.allocation}
        options={[
          { value: "STR", label: words.allocations.STR },
          { value: "DEX", label: words.allocations.DEX },
        ]}
        value={focus}
        onChange={setFocus}
      />
    </ControlRow>
  );
}
