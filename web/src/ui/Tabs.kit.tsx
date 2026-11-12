import { useState } from "react";

import { KitPad, type KitBlock } from "../kit/kit";
import { SETTINGS_TABS } from "../views/RunSettings";
import { Tabs } from "./Tabs";

const noop = () => {};

function LiveTabs() {
  const [selected, setSelected] = useState(0);
  return (
    <Tabs label="Run settings" tabs={SETTINGS_TABS} selected={selected} onSelect={setSelected}>
      <KitPad>
        <p className="kit-note">{SETTINGS_TABS[selected]}</p>
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
    states: SETTINGS_TABS.map((tab, index) => ({
      label: `${tab} selected`,
      render: () => (
        <Tabs label="Run settings" tabs={SETTINGS_TABS} selected={index} onSelect={noop}>
          {null}
        </Tabs>
      ),
    })),
    Live: LiveTabs,
    note: "The arrow keys, Home and End move between tabs.",
  },
];
