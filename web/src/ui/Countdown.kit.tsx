import { Restarting, type KitBlock } from "../kit/kit";
import { Countdown } from "./Countdown";

export const kit: readonly KitBlock[] = [
  {
    id: "countdown",
    title: "Countdown",
    section: "groups",
    size: "small",
    states: [],
    Live: () => <Restarting>{(restart) => <Countdown from={5} label="Next objective in" onZero={restart} />}</Restarting>,
    note: "It runs on its own, as after Done; here it starts again as it runs out.",
  },
];
