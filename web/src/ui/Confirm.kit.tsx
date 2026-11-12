import { useState } from "react";

import { KitScreen, type KitBlock, type KitProps } from "../kit/kit";
import { NewRunConfirm } from "../views/RunMenu";
import { BottomBar, GlowBand, RuledButton } from "./BottomBar";
import { Screen } from "./Screen";

const noop = () => {};

function LiveConfirm({ kit }: KitProps) {
  const [open, setOpen] = useState(false);
  return (
    <KitScreen>
      <Screen
        sheet={
          <NewRunConfirm
            open={open}
            run={kit.runs.progressed}
            onClose={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
          />
        }
        bottom={
          <BottomBar>
            <RuledButton onClick={() => setOpen(true)}>New run</RuledButton>
            <GlowBand onClick={noop}>Resume</GlowBand>
          </BottomBar>
        }
      >
        {null}
      </Screen>
    </KitScreen>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "confirm",
    title: "Confirmation",
    section: "groups",
    size: "phone",
    states: [],
    Live: LiveConfirm,
    note: "Tap New run. Each confirmation over its screen is under Sheets over their screens; its chips are under Chip.",
  },
];
