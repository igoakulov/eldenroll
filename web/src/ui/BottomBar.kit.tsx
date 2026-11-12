import { useState } from "react";

import { WAITING_MESSAGES } from "../engine/run";
import { KitScreen, type KitBlock, type KitProps } from "../kit/kit";
import { StatSteppers } from "../views/StatsAndRegions";
import { BottomBar, GlowBand, RuledButton } from "./BottomBar";
import { Screen } from "./Screen";

const noop = () => {};

function LiveBar({ kit }: KitProps) {
  const [stats, setStats] = useState(kit.runs.first.stats);
  return (
    <KitScreen>
      <Screen
        bottom={
          <BottomBar>
            <RuledButton icon="reroll" onClick={noop}>
              Reroll
            </RuledButton>
            <GlowBand onClick={noop}>Done</GlowBand>
          </BottomBar>
        }
      >
        <StatSteppers stats={stats} onStats={setStats} />
      </Screen>
    </KitScreen>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "glow-band",
    title: "Glow band",
    section: "controls",
    size: "phone",
    states: [
      { label: "lit", render: () => <GlowBand>Start run</GlowBand> },
      { label: "long", render: () => <GlowBand long>Confirm and reroll</GlowBand> },
    ],
    Live: () => <GlowBand onClick={noop}>Done</GlowBand>,
    note: "Pressed, the glow brightens for an instant; on desktop, hover brightens it a little. Both show on the live one.",
  },
  {
    id: "ruled-button",
    title: "Ruled button",
    section: "controls",
    size: "small",
    states: [
      {
        label: "with an icon",
        render: () => (
          <RuledButton icon="reroll" onClick={noop}>
            Reroll
          </RuledButton>
        ),
      },
      { label: "plain", render: () => <RuledButton onClick={noop}>New run</RuledButton> },
    ],
    Live: () => (
      <RuledButton icon="reroll" onClick={noop}>
        Reroll
      </RuledButton>
    ),
    note: "Pressed or hovered, its label and rules brighten.",
  },
  {
    id: "bottom-bar",
    title: "Bottom bar",
    section: "groups",
    size: "phone",
    states: [
      {
        label: "one action",
        render: () => (
          <BottomBar>
            <GlowBand onClick={noop}>Start run</GlowBand>
          </BottomBar>
        ),
      },
      {
        label: "two actions",
        render: () => (
          <BottomBar>
            <RuledButton onClick={noop}>New run</RuledButton>
            <GlowBand onClick={noop}>Resume</GlowBand>
          </BottomBar>
        ),
      },
      {
        label: "a notice",
        render: () => (
          <BottomBar notice={`${WAITING_MESSAGES.no_bosses}.`}>
            <GlowBand onClick={noop}>Roll objective 2</GlowBand>
          </BottomBar>
        ),
      },
    ],
    Live: LiveBar,
    note: "The live one scrolls, so the screen shows under the bar's dimmed strip.",
  },
];
