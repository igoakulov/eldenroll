import type { KitBlock, KitProps } from "../kit/kit";
import { Card } from "../views/Card";
import { PhoneFrame } from "./PhoneFrame";

const noop = () => {};

function LiveFrame({ kit }: KitProps) {
  return (
    <PhoneFrame>
      <Card
        data={kit.engine.data}
        run={kit.runs.first}
        reveal="none"
        onReroll={noop}
        onDone={noop}
        onFelled={noop}
        onLevelUp={noop}
      />
    </PhoneFrame>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "phone-frame",
    title: "Desktop frame",
    section: "groups",
    size: "wide",
    states: [],
    Live: LiveFrame,
    note: "Drawn on a window wider and taller than a phone, scaled to the window's height; a phone-sized window gets the app alone.",
  },
];
