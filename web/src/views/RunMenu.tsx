import { useState } from "react";

import { copy } from "../copy";
import type { EngineData } from "../engine/engineData";
import { objectiveNumber, type Run } from "../engine/run";
import { Confirm, type ConfirmPart } from "../ui/Confirm";
import { ListRow } from "../ui/Rows";
import { Sheet } from "../ui/Sheet";
import { Wordmark } from "../ui/Wordmark";
import "./RunMenu.css";

/** The run in progress as a row names it: `Objective N` and its boss, without one between objectives. */
export function runTitle(data: EngineData, run: Run): string {
  const boss = run.current === null ? undefined : data.bosses.get(run.current.boss);
  return copy.common.runTitle(objectiveNumber(run), boss?.name);
}

/** What finishing `run` does. Each sheet words `Cannot resume` its own way. */
function finishParts(run: Run, cannotResume: string): readonly ConfirmPart[] {
  return [
    ...(run.current === null ? [] : [{ text: copy.confirm.abandonObjective(objectiveNumber(run)), lost: true }]),
    { text: cannotResume, lost: true },
    // A run with no completed objective is not saved (web/README.md#All runs)
    ...(run.completed.length === 0 ? [] : [{ text: copy.confirm.saveToAllRuns, lost: false }]),
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
      title={copy.common.newRun}
      question={copy.confirm.newRunQuestion}
      parts={finishParts(run, copy.confirm.newRunCannotResume)}
      action={copy.confirm.newRunAction}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

export function FinishRunConfirm({
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
      title={copy.common.finishRun}
      question={copy.confirm.finishQuestion}
      parts={finishParts(run, copy.confirm.finishCannotResume)}
      action={copy.common.finishRun}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

/** What the `All runs` row holds, on Start and in the menu: this run, if one is in progress, and the finished ones. */
export function runsDetail(inProgress: boolean, finished: number): string {
  if (!inProgress) return copy.menu.finishedRuns(finished);
  return finished === 0 ? copy.menu.thisRun : copy.menu.thisRunAnd(finished);
}

export interface RunMenuActions {
  /** How many finished runs are kept, for the `All runs` row's line. */
  readonly finishedRuns: number;
  readonly onRuns: () => void;
  readonly onSummary: () => void;
  readonly onHome: () => void;
  readonly onHowItWorks: () => void;
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
      <Sheet
        open={open && !finishing}
        eyebrow={copy.common.menu}
        mark={<Wordmark small onHome={actions.onHome} />}
        closeLabel={copy.menu.close}
        onClose={onClose}
      >
        {/* The app's own rows under the wordmark; the run's lower, nearer the thumb, after a wider gap */}
        <div className="run-menu">
          <ListRow
            title={copy.common.howItWorks}
            detail={copy.menu.howItWorksDetail}
            onClick={actions.onHowItWorks}
          />
          <ListRow title={copy.common.runs} detail={runsDetail(true, actions.finishedRuns)} onClick={actions.onRuns} />
        </div>
        <div className="run-menu run-menu-run">
          <ListRow title={copy.menu.summary} detail={copy.menu.summaryDetail} onClick={actions.onSummary} />
          <ListRow
            title={copy.common.runSettings}
            detail={copy.common.runSettingsDetail}
            onClick={actions.onRunSettings}
          />
          <ListRow
            title={copy.common.finishRun}
            detail={copy.menu.finishRunDetail}
            danger
            onClick={() => setFinishing(true)}
          />
        </div>
      </Sheet>
      <FinishRunConfirm open={open && finishing} run={run} onConfirm={actions.onFinish} onClose={onClose} />
    </>
  );
}
