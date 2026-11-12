import { useState } from "react";

import { copy } from "../copy";
import { KitPad, type KitBlock } from "../kit/kit";
import { SETTINGS_TABS } from "../views/RunSettings";
import { Tabs } from "./Tabs";

const noop = () => {};
const TABS = SETTINGS_TABS.map((tab) => copy.runSettings.tabs[tab]);

function LiveTabs() {
  const [selected, setSelected] = useState(0);
  return (
    <Tabs label={copy.common.runSettings} tabs={TABS} selected={selected} onSelect={setSelected}>
      <KitPad>
        <p className="kit-note">{TABS[selected]}</p>
      </KitPad>
    </Tabs>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "tabs",
    title: "Tabs",
    section: "groups",
    size: "phone",
    states: TABS.map((tab, index) => ({
      label: `${tab} selected`,
      render: () => (
        <Tabs label={copy.common.runSettings} tabs={TABS} selected={index} onSelect={noop}>
          {null}
        </Tabs>
      ),
    })),
    Live: LiveTabs,
    note: "The arrow keys, Home and End move between tabs.",
  },
];
