import { copy } from "../copy";
import { Restarting, type KitBlock } from "../kit/kit";
import { Countdown, useCountdown } from "./Countdown";

function Running({ onZero }: { readonly onZero: () => void }) {
  const { left, remaining } = useCountdown(5, onZero);
  return <Countdown from={5} left={left} remaining={remaining} label={copy.felled.nextObjectiveIn} />;
}

export const kit: readonly KitBlock[] = [
  {
    id: "countdown",
    title: "Countdown",
    section: "groups",
    size: "small",
    states: [],
    Live: () => <Restarting>{(restart) => <Running onZero={restart} />}</Restarting>,
    note: "It runs on its own, as after Done; here it starts again as it runs out. Each second lands like a hit on the boss bar: the gold drops and a bronze trail drains after it. On the felled screen a tap on the words or the countdown takes a second off, landing the same way.",
  },
];
