import type { KitBlock } from "../kit/kit";
import { EMPTY_SLOT_ICONS, iconKey } from "../views/icons";
import { Tile } from "./Tile";

export const kit: readonly KitBlock[] = [
  {
    id: "tile",
    title: "Tile",
    section: "controls",
    size: "small",
    states: [
      { label: "large", render: ({ samples }) => <Tile size="lg" icon={iconKey(samples.weapon)} /> },
      { label: "large, none", render: () => <Tile size="lg" icon={EMPTY_SLOT_ICONS.rh} empty /> },
      { label: "small", render: ({ samples }) => <Tile size="sm" icon={iconKey(samples.talisman)} /> },
      { label: "small, none", render: () => <Tile size="sm" icon={EMPTY_SLOT_ICONS.talisman} empty /> },
      {
        label: "linked",
        render: ({ samples }) => (
          <Tile
            size="sm"
            icon={iconKey(samples.talisman)}
            link={samples.talisman.url === null ? null : { name: samples.talisman.name, url: samples.talisman.url }}
          />
        ),
      },
    ],
    Live: ({ kit }) => (
      <Tile
        size="lg"
        icon={iconKey(kit.samples.weapon)}
        link={kit.samples.weapon.url === null ? null : { name: kit.samples.weapon.name, url: kit.samples.weapon.url }}
      />
    ),
    note: "A linked tile opens the item's wiki page in a new tab.",
  },
];
