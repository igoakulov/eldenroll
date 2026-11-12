import { useState } from "react";

import type { EngineData } from "../engine/engineData";
import { objectiveNumber, type Run } from "../engine/run";
import { Confirm, type ConfirmPart } from "../ui/Confirm";
import { ListRow } from "../ui/Rows";
import { Sheet } from "../ui/Sheet";
import "./RunMenu.css";

/** The run in progress as a row names it: `Objective N` and its boss, without one between objectives. */
export function runTitle(data: EngineData, run: Run): string {
  const boss = run.current === null ? undefined : data.bosses.get(run.current.boss);
  return `Objective ${objectiveNumber(run)}${boss === undefined ? "" : `, ${boss.name}`}`;
}

/** What finishing `run` does. Each sheet words `Cannot resume` its own way. */
function finishParts(run: Run, cannotResume: string): readonly ConfirmPart[] {
  return [
    ...(run.current === null ? [] : [{ text: `Abandon objective ${objectiveNumber(run)}`, lost: true }]),
    { text: cannotResume, lost: true },
    // A run with no completed objective is not saved (web/README.md#Run history)
    ...(run.completed.length === 0 ? [] : [{ text: "Save to Run history", lost: false }]),
  ];
}

export function NewRunConfirm({
  open,
  run,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly run: Run;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <Confirm
      open={open}
      title="New run"
      question="Finish the current run and start a new one?"
      parts={finishParts(run, "Cannot resume current run")}
      action="Start new run"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

export interface RunMenuActions {
  readonly onRunSettings: () => void;
  readonly onFinish: () => void;
}

/** The menu over the card or `Level up`, and the `Finish run` confirmation it leads to. */
export function RunMenu({
  open,
  run,
  actions,
  onClose,
}: {
  readonly open: boolean;
  readonly run: Run;
  readonly actions: RunMenuActions;
  readonly onClose: () => void;
}) {
  // `finishing` outlives `open`, so the sheet that was showing is the one that fades out
  const [wasOpen, setWasOpen] = useState(open);
  const [finishing, setFinishing] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFinishing(false);
  }

  return (
    <>
      <Sheet open={open && !finishing} eyebrow="Menu" closeLabel="Close menu" onClose={onClose}>
        <div className="run-menu">
          {/* Run history (9.10) and the run's own row, opening its view (9.7), join the menu once those screens exist */}
          <ListRow title="Run settings" detail="Classes, never roll, shortlist, bosses" onClick={actions.onRunSettings} />
          <ListRow
            title="Finish run"
            detail="Ends this run and shows its summary"
            danger
            onClick={() => setFinishing(true)}
          />
        </div>
      </Sheet>
      <Confirm
        open={open && finishing}
        title="Finish run"
        question="End this run and see its summary?"
        parts={finishParts(run, "Cannot resume")}
        action="Finish run"
        onConfirm={actions.onFinish}
        onClose={onClose}
      />
    </>
  );
}
