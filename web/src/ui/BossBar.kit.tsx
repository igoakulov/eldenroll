import type { KitBlock } from "../kit/kit";
import { BossBar } from "./BossBar";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "boss-bar",
    title: "Boss bar",
    section: "controls",
    size: "phone",
    note: "The whole bar taps Felled?, reaching down over the location and not up toward the boss name.",
    states: [{ label: "plain", render: () => <BossBar onFelled={noop} /> }],
    Live: () => <BossBar onFelled={noop} />,
  },
];
