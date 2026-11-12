import { derivedLevel } from "../engine/settings";
import { objectiveNumber } from "../engine/run";
import type { KitBlock } from "../kit/kit";
import { FramedIconButton, LevelButton, TopBar } from "./TopBar";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "framed-icon-button",
    title: "Framed icon button",
    section: "controls",
    size: "small",
    states: [
      { label: "menu", render: () => <FramedIconButton icon="menu" label="Menu" onClick={noop} /> },
      { label: "close", render: () => <FramedIconButton icon="close" label="Close" onClick={noop} /> },
    ],
    Live: () => <FramedIconButton icon="menu" label="Menu" onClick={noop} />,
    note: "On desktop, hover brightens the frame.",
  },
  {
    id: "level-button",
    title: "Level button",
    section: "controls",
    size: "small",
    states: [{ label: "plain", render: ({ runs }) => <LevelButton level={derivedLevel(runs.first.stats)} onClick={noop} /> }],
    Live: ({ kit }) => <LevelButton level={derivedLevel(kit.runs.first.stats)} onClick={noop} />,
  },
  {
    id: "top-bar",
    title: "Top bar",
    section: "groups",
    size: "phone",
    states: [
      {
        label: "on the card",
        render: ({ runs }) => (
          <TopBar eyebrow={`Objective ${objectiveNumber(runs.first)}`}>
            <LevelButton level={derivedLevel(runs.first.stats)} onClick={noop} />
            <FramedIconButton icon="menu" label="Menu" onClick={noop} />
          </TopBar>
        ),
      },
      {
        label: "on a screen",
        render: () => (
          <TopBar eyebrow="New run">
            <FramedIconButton icon="close" label="Close without saving" onClick={noop} />
          </TopBar>
        ),
      },
    ],
  },
];
