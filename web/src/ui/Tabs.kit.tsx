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
    <Tabs
      label={copy.common.runSettings}
      tabs={TABS}
      selected={selected}
      onSelect={setSelected}
      panels={TABS.map((tab) => (
        <KitPad key={tab}>
          <p className="kit-note">{tab}</p>
        </KitPad>
      ))}
    />
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "tabs",
    title: "Tabs",
    section: "groups",
    size: "phone",
    states: [
      ...TABS.map((tab, index) => ({
      label: `${tab} selected`,
      render: () => (
        <Tabs label={copy.common.runSettings} tabs={TABS} selected={index} onSelect={noop} panels={TABS.map(() => null)} />
      ),
    })),
      {
        label: "fit: as tall as the selected panel",
        render: () => (
          <Tabs
            label={copy.common.runSettings}
            tabs={TABS}
            selected={0}
            onSelect={noop}
            fit
            panels={TABS.map((tab, index) => (
              <KitPad key={tab}>
                {TABS.slice(0, index + 1).map((line) => (
                  <p key={line} className="kit-note">
                    {line}
                  </p>
                ))}
              </KitPad>
            ))}
          />
        ),
      },
    ],
    Live: LiveTabs,
    note: "The arrow keys, Home and End move between tabs. Without fit, every panel is as tall as the tallest; with it, choosing a tab from below the tab row scrolls back to it.",
  },
];
