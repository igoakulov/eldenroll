import { useState } from "react";

import { copy } from "../copy";
import type { KitBlock, KitProps } from "../kit/kit";
import { CHARACTER_CLASS_ICONS, iconKey } from "../views/icons";
import { findMatch } from "../views/search";
import { RegionCheck } from "../views/StatsAndRegions";
import { Icon } from "./Icon";
import { LozengeCheckbox } from "./LozengeCheckbox";
import { SearchMatch } from "./SearchField";

const noop = () => {};

/** A word inside a name, as a search would match it there rather than at its start. */
function innerWord(name: string): string {
  const words = name.split(" ");
  return words[Math.floor(words.length / 2)] ?? name;
}

function classIcons(id: string): string[] {
  return (CHARACTER_CLASS_ICONS[id] ?? []).map((icon) => `${icon}-22`);
}

function LiveCheckbox({ kit }: KitProps) {
  const { characterClass } = kit.samples;
  const [checked, setChecked] = useState(true);
  return (
    <LozengeCheckbox checked={checked} icons={classIcons(characterClass.id)} onChange={setChecked}>
      {characterClass.name}
    </LozengeCheckbox>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "lozenge-checkbox",
    title: "Lozenge checkbox",
    section: "controls",
    size: "phone",
    states: [
      {
        label: "unticked",
        render: ({ database, samples }) => (
          <RegionCheck region={samples.region} regions={database.region} selected={[]} onRegions={noop} />
        ),
      },
      {
        label: "ticked",
        render: ({ database, samples }) => (
          <RegionCheck region={samples.region} regions={database.region} selected={[samples.region.id]} onRegions={noop} />
        ),
      },
      {
        label: "tagged",
        render: ({ database, samples }) => (
          <RegionCheck region={samples.dlcRegion} regions={database.region} selected={[]} onRegions={noop} />
        ),
      },
      {
        label: "icons, unticked",
        render: ({ samples }) => (
          <LozengeCheckbox checked={false} icons={classIcons(samples.characterClass.id)} onChange={noop}>
            {samples.characterClass.name}
          </LozengeCheckbox>
        ),
      },
      {
        label: "icons, ticked",
        render: ({ samples }) => (
          <LozengeCheckbox checked icons={classIcons(samples.characterClass.id)} onChange={noop}>
            {samples.characterClass.name}
          </LozengeCheckbox>
        ),
      },
      {
        label: "a lead icon",
        render: ({ samples }) => (
          <LozengeCheckbox checked lead={<Icon name={`${iconKey(samples.weapon) ?? ""}-22`} size={22} />} onChange={noop}>
            {samples.weapon.name}
          </LozengeCheckbox>
        ),
      },
      {
        label: "a search result",
        render: ({ samples }) => (
          <LozengeCheckbox
            checked={false}
            result
            lead={<Icon name={`${iconKey(samples.weapon) ?? ""}-22`} size={22} />}
            onChange={noop}
          >
            <SearchMatch name={samples.weapon.name} match={findMatch(samples.weapon.name, innerWord(samples.weapon.name)) ?? undefined} />
          </LozengeCheckbox>
        ),
      },
      {
        label: "framed",
        render: () => (
          <LozengeCheckbox framed checked={false} onChange={noop}>
            {copy.runSettings.shortlistEnabled}
          </LozengeCheckbox>
        ),
      },
    ],
    Live: LiveCheckbox,
  },
];
