import type { KitBlock } from "../kit/kit";
import { AppIcon } from "./AppIcon";

export const kit: readonly KitBlock[] = [
  {
    id: "app-icon",
    title: "App icon",
    section: "controls",
    size: "small",
    states: [{ label: "plain", render: () => <AppIcon /> }],
  },
];
