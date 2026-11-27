import { copy } from "../copy";
import type { EngineData } from "../engine/engineData";
import type { Run } from "../engine/run";
import type { Finished } from "../save/finished";
import { HeadingCount, ScreenHead, SectionHeading } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { Screen } from "../ui/Screen";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { Wordmark } from "../ui/Wordmark";
import { runTitle } from "./RunMenu";
import { finishedHeading, finishedOn } from "./RunView";
import "./AllRuns.css";

/** Every run: the one in progress first, its row opening its objective as `Resume` does, since playing on is what the
 * player came for; then the finished ones, newest first, each opening its view (web/README.md#All runs). */
export function AllRuns({
  data,
  run,
  finished,
  onResume,
  onOpen,
  onClose,
}: {
  readonly data: EngineData;
  readonly run: Run | null;
  /** Newest first. */
  readonly finished: readonly Finished[];
  readonly onResume: () => void;
  readonly onOpen: (finished: Finished) => void;
  readonly onClose: () => void;
}) {
  return (
    <Screen className="all-runs">
      {/* Where the player is: the objective mid-run, else the app itself, since the list belongs to no run */}
      <TopBar eyebrow={copy.common.runs} mark={<Wordmark small />}>
        <FramedIconButton icon="close" label={copy.common.close} onClick={onClose} />
      </TopBar>
      <ScreenHead title={copy.common.runs} />
      {run !== null && (
        <section>
          <SectionHeading>{copy.runView.current}</SectionHeading>
          <div className="all-runs-rows">
            <ListRow title={runTitle(data, run)} detail={copy.runView.inProgress} cut onClick={onResume} />
          </div>
        </section>
      )}
      {finished.length > 0 && (
        <section>
          <SectionHeading>
            <HeadingCount>{finished.length}</HeadingCount> {copy.allRuns.finished(finished.length)}
          </SectionHeading>
          <div className="all-runs-rows">
            {finished.map((one) => {
              return (
                <ListRow
                  key={one.runId}
                  title={copy.allRuns.finishedTitle(
                    copy.runView.objectives(one.objectives.length),
                    finishedHeading(data, one).title,
                  )}
                  detail={finishedOn(one.finishedAt)}
                  cut
                  onClick={() => onOpen(one)}
                />
              );
            })}
          </div>
        </section>
      )}
    </Screen>
  );
}
