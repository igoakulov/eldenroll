import { useState } from "react";

import { copy } from "../copy";
import { objectiveNumber } from "../engine/run";
import { KitScreen, type KitBlock, type KitProps } from "../kit/kit";
import { RunMenu } from "../views/RunMenu";
import { Screen } from "./Screen";
import { FramedIconButton, TopBar } from "./TopBar";

const noop = () => {};

function LiveSheet({ kit }: KitProps) {
  const [open, setOpen] = useState(false);
  const run = kit.runs.progressed;
  return (
    <KitScreen>
      <Screen
        sheet={
          <RunMenu
            open={open}
            run={run}
            actions={{ onHowItWorks: noop, onRunSettings: noop, onFinish: () => setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        }
      >
        <TopBar eyebrow={copy.common.objective(objectiveNumber(run))}>
          <FramedIconButton icon="menu" label={copy.common.menu} onClick={() => setOpen(true)} />
        </TopBar>
      </Screen>
    </KitScreen>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "sheet",
    title: "Sheet",
    section: "groups",
    size: "phone",
    states: [],
    Live: LiveSheet,
    note: "Open the menu: Esc closes it, Tab stays inside it, and closing returns focus to the menu button. Every sheet over its screen is under Sheets over their screens.",
  },
];
