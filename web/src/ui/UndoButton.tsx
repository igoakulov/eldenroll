import { copy } from "../copy";
import { Icon } from "./Icon";
import "./UndoButton.css";
import { KEY_ATTRIBUTE } from "./keys";

/** `Undo` on a countdown: large dotted-underlined caps, standing alone at the bottom of the screen. */
export function UndoButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button type="button" className="undo-button" {...{ [KEY_ATTRIBUTE]: "escape" }} onClick={onClick}>
      <Icon name="undo" size={22} />
      <span className="undo-button-label">{copy.controls.undo}</span>
    </button>
  );
}
