import type { KitBlock } from "../kit/kit";
import { UndoButton } from "./UndoButton";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "undo-button",
    title: "Undo",
    section: "controls",
    size: "small",
    states: [{ label: "plain", render: () => <UndoButton onClick={noop} /> }],
    Live: () => <UndoButton onClick={noop} />,
  },
];
