import type { Database } from "../engine/database";
import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import { DEFAULT_REGIONS } from "../engine/regions";
import {
  alreadyDead,
  done,
  editRun,
  reroll,
  rollNext,
  setBossState,
  startRun,
  type Engine,
  type RerollTarget,
  type Run,
} from "../engine/run";
import { DEFAULT_STATS, defaultSettings, type Settings } from "../engine/settings";
import { recordOf, type Finished } from "../save/finished";
import { hasObjective, type RunWithObjective } from "../views/Card";
import { neverRollEntries, shortlistEntries, type GearEntry } from "../views/gearList";
import { rerollTarget } from "../views/rerollScope";
import { samples, type Samples } from "./samples";

/** What every block of the kit draws from: the database, the engine over it, and runs at fixed seeds, each built
 * through the engine as `App.tsx` builds it. */
export interface KitData {
  readonly database: Database;
  readonly engine: Engine;
  readonly samples: Samples;
  readonly settings: Settings;
  readonly gear: { readonly neverRoll: readonly GearEntry[]; readonly shortlist: readonly GearEntry[] };
  readonly runs: {
    /** The first objective of a run. */
    readonly first: RunWithObjective;
    /** `first` after `Done`, waiting on `Level up`. */
    readonly afterDone: Run;
    /** `afterDone` with every region unticked and `Roll objective 2` tapped: the run waits with its message. */
    readonly waiting: Run;
    /** Another run's first objective, for a reroll. */
    readonly toReroll: RunWithObjective;
    /** Two objectives done, a boss felled on the way between them, the third current. */
    readonly progressed: RunWithObjective;
    /** Twelve objectives done across every region, each after a reroll, with bosses felled on the way and one
     * skipped; the thirteenth current. */
    readonly long: RunWithObjective;
    /** `long` as a finished run. */
    readonly finished: Finished;
  };
}

function withObjective(run: Run): RunWithObjective {
  if (!hasObjective(run)) throw new Error(`The kit's run at seed ${run.seed} has no objective`);
  return run;
}

export function kitData(database: Database): KitData {
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  const settings = defaultSettings(database);
  const start = (seed: number) => {
    const result = startRun(
      engine,
      { stats: DEFAULT_STATS, settings, regions: DEFAULT_REGIONS, weaponShortlist: [], deadBosses: [] },
      seed,
    );
    if (!result.ok) throw new Error(`The kit's run at seed ${seed} did not start: ${result.problems.join("; ")}`);
    return withObjective(result.run);
  };

  const first = start(1);
  const long = longRun(engine, settings, database);
  const afterDone = done(engine, first);
  return {
    database,
    engine,
    samples: samples(database),
    settings,
    gear: { neverRoll: neverRollEntries(database), shortlist: shortlistEntries(database) },
    runs: {
      first,
      afterDone,
      waiting: rollNext(engine, editRun(afterDone, { regions: [] })),
      toReroll: start(2),
      progressed: withObjective(
        rollNext(engine, done(engine, alreadyDead(engine, rollNext(engine, done(engine, start(3)))))),
      ),
      long,
      finished: { runId: "kit", startedAt: "2026-12-01T18:00:00Z", finishedAt: "2027-01-10T21:00:00Z", ...recordOf(long) },
    },
  };
}

const LONG_REROLLS: readonly RerollTarget[] = ["boss", "character_class", "rh", "armor", "talisman_1", "rule", "spell", "lh"];

function longRun(engine: Engine, settings: Settings, database: Database): RunWithObjective {
  const result = startRun(
    engine,
    { stats: DEFAULT_STATS, settings, regions: database.region.map((row) => row.id), weaponShortlist: [], deadBosses: [] },
    4,
  );
  if (!result.ok) throw new Error(`The kit's long run did not start: ${result.problems.join("; ")}`);
  let run = result.run;
  LONG_REROLLS.concat(LONG_REROLLS.slice(0, 4)).forEach((target, index) => {
    if (run.current === null) return;
    run = reroll(engine, run, rerollTarget(run.current.slots, target));
    if (index === 3 || index === 7) run = alreadyDead(engine, run);
    if (index === 5) {
      const current = run.current?.boss;
      const other = database.boss_instance.find((boss) => boss.odds > 0 && boss.id !== current && !run.deadBosses.some((row) => row.instanceId === boss.id));
      if (other !== undefined) run = setBossState(engine, run, other.id, "skipped");
    }
    run = rollNext(engine, done(engine, run));
  });
  return withObjective(run);
}
