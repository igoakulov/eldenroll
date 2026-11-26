import type { KitBlock } from "../kit/kit";
import { BossBar } from "./BossBar";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "boss-bar",
    title: "Boss bar",
    section: "controls",
    size: "phone",
    note: "Felled? sits near the right end, under the thumb; its tap target reaches down, clear of the boss name above.",
    states: [{ label: "plain", render: () => <BossBar onFelled={noop} /> }],
    Live: () => <BossBar onFelled={noop} />,
  },
];
