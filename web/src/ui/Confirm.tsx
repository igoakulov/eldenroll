import { copy } from "../copy";
import { GlowBand } from "./BottomBar";
import { Chip, Chips } from "./Chips";
import { Sheet } from "./Sheet";
import "./Confirm.css";

/** One thing the action does: `lost` is red, anything else is kept and gold. */
export interface ConfirmPart {
  readonly text: string;
  readonly lost: boolean;
}

/** A confirmation sheet: a question, chips for what happens, and the action in the glow band. */
export function Confirm({
  open,
  title,
  question,
  parts,
  action,
  onConfirm,
  onClose,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly question: string;
  readonly parts: readonly ConfirmPart[];
  readonly action: string;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <Sheet open={open} eyebrow={title} alert onClose={onClose}>
      <p className="confirm-ask">{question}</p>
      <Chips label={copy.confirm.chipsLabel}>
        {parts.map((part) => (
          <Chip key={part.text} lit={!part.lost} red={part.lost}>
            {part.text}
          </Chip>
        ))}
      </Chips>
      <div className="confirm-action">
        {/* Each confirmation loses something, so it takes a deliberate press, never `Enter` */}
        <GlowBand enter={false} onClick={onConfirm}>
          {action}
        </GlowBand>
      </div>
    </Sheet>
  );
}
