import type { Ref } from "react";

import { Icon } from "./Icon";
import "./UndoButton.css";

/** `Undo` on a countdown: large dotted-underlined caps, standing alone at the bottom of the screen. */
export function UndoButton({ onClick, ref }: { readonly onClick: () => void; readonly ref?: Ref<HTMLButtonElement> }) {
  return (
    <button ref={ref} type="button" className="undo-button" onClick={onClick}>
      <Icon name="undo" size={22} />
      Undo
    </button>
  );
}
