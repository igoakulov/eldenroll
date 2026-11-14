// One full run from `Start run` until every boss is felled (web/sim/README.md#A run)
import type { Database, LoadoutSlot } from "../src/engine/database";
import type { RolledSlots } from "../src/engine/display";
import { done, editRun, rollNext, startRun, type Engine, type Run } from "../src/engine/run";
import { DEFAULT_STATS, defaultSettings, derivedLevel, type Stats } from "../src/engine/settings";
import { repeatKey, type SlotRoll, type WeightedOption } from "../src/engine/slotRoll";
import {
  ITEMS_MAX_STAT_GAP,
  bossesByRegion,
  bossRegions,
  levelUp,
  meetRequirements,
  newPlayer,
  requirements,
  ALLOCATIONS,
  type Allocation,
} from "./player";

export interface SimOptions {
  readonly allocation: Allocation;
  readonly seed: number;
  /** The regions the run may open, in any order; null for every region. */
  readonly regions: readonly string[] | null;
  /** The percentage of a region's bosses felled, rounding up, before the next one opens. */
  readonly completion: number;
  readonly characterClasses: readonly string[] | null;
  /** Where to add every option's chance at roll time, for the page's item charts; left out by the dump. */
  readonly chances?: ChanceSums;
}

/** Objectives per stretch in `ChanceSums` and the page's charts. */
export const BUCKET = 20;

/** Slots whose options' chances are summed: the second talisman and combat rule slots leave out what the first
 * rolled, so they run close to the first and are left out. */
export const CHANCE_SLOTS: readonly LoadoutSlot[] = ["rh", "rh_ash", "lh", "lh_ash", "spell", "item", "talisman_1", "rule_1", "armor"];

/** Every option's chance at roll time, with the catch-up boost and with it removed from every option, summed over
 * the rolls of one class and slot in one stretch of `BUCKET` objectives, across runs: `chanceKey` to sums.
 * `boosted` adds each chance without catch-up times the option's catch-up boost, so `boosted / plain` is the
 * stretch's mean boost. An alias counts once per roll, its members' chances added. */
export type ChanceSums = Map<string, ChanceSum>;

export interface ChanceSum {
  chance: number;
  plain: number;
  boosted: number;
  rolls: number;
}

export function chanceKey(characterClass: string, slot: LoadoutSlot, key: string, stretch: number): string {
  return `${characterClass}|${slot}|${key}|${stretch}`;
}

/** The stretch an objective falls in, by its first objective number. */
export function stretchOf(objective: number): number {
  return Math.floor((objective - 1) / BUCKET) * BUCKET + 1;
}

/** A boost this large or more is a guarantee (`data/balance.md#Tiers`). */
export const GUARANTEE = 100_000;

export interface RollRow {
  readonly objective: number;
  readonly region: string;
  readonly level: number;
  readonly characterClass: string;
  readonly boss: string;
  readonly slot: LoadoutSlot;
  readonly chosen: string | null;
  readonly chosenKey: string | null;
  readonly chance: number;
  /** The catch-up boost on the chosen option. */
  readonly catchUp: number;
  readonly pool: number;
  readonly noneChance: number | null;
  /** Summed chance of options boosted ×100,000 or more, if any. */
  readonly guaranteedChance: number | null;
  readonly guaranteedWon: boolean;
  /** Ids of boosting modifiers (×>1) active on any option in the pool. */
  readonly boosts: readonly string[];
  /** Summed chance of the options each boost hits, in `boosts` order. */
  readonly boostChances: readonly number[];
  /** The chosen option's boosting modifiers. */
  readonly chosenBoosts: readonly string[];
}

export interface ObjectiveRow {
  readonly objective: number;
  readonly region: string;
  readonly regionsOpen: number;
  readonly level: number;
  readonly stats: Stats;
  readonly boss: string;
  readonly characterClass: string;
  readonly slots: RolledSlots;
}

export interface RunResult {
  readonly options: SimOptions;
  readonly rolls: RollRow[];
  readonly objectives: ObjectiveRow[];
  readonly finalStats: Stats;
  /** Every option key any pool offered, by class, to tell "never rolled" from "never in reach". */
  readonly offered: Map<string, Set<string>>;
}

function boostOf(row: WeightedOption): number {
  return row.modifiers.reduce((product, modifier) => product * modifier.value, 1);
}

interface Observed {
  readonly slot: LoadoutSlot;
  readonly roll: SlotRoll;
}

function describe(observed: Observed, offered: Set<string>, sum?: (key: string, sums: Omit<ChanceSum, "rolls">) => void) {
  const { roll } = observed;
  const options = roll.options;
  const total = options.reduce((sum, row) => sum + row.weight, 0);
  const plain = options.map((row) => row.option.row.odds * boostOf(row));
  const plainTotal = plain.reduce((sum, value) => sum + value, 0);
  let none: number | null = null;
  let guaranteed = 0;
  let hasGuaranteed = false;
  const boostChance = new Map<string, number>();
  const byKey = new Map<string, Omit<ChanceSum, "rolls">>();
  options.forEach((row, index) => {
    const key = repeatKey(row.option);
    offered.add(key);
    const chance = row.weight / total;
    if (sum !== undefined) {
      const chancePlain = plain[index]! / plainTotal;
      const sums = byKey.get(key) ?? { chance: 0, plain: 0, boosted: 0 };
      sums.chance += chance;
      sums.plain += chancePlain;
      sums.boosted += chancePlain * row.catchUp;
      byKey.set(key, sums);
    }
    if (row.option.kind !== "armor_set" && row.option.row.id === "none") none = chance;
    if (boostOf(row) >= GUARANTEE) {
      hasGuaranteed = true;
      guaranteed += chance;
    }
    for (const modifier of row.modifiers) {
      if (modifier.value > 1) boostChance.set(modifier.id, (boostChance.get(modifier.id) ?? 0) + chance);
    }
  });
  for (const [key, sums] of byKey) sum?.(key, sums);
  const chosen = roll.chosen;
  return {
    chosen: chosen?.option.row.id ?? null,
    chosenKey: chosen === null ? null : repeatKey(chosen.option),
    chance: roll.probability,
    catchUp: chosen?.catchUp ?? 1,
    pool: roll.pool,
    noneChance: none as number | null,
    guaranteedChance: hasGuaranteed ? guaranteed : null,
    guaranteedWon: chosen !== null && boostOf(chosen) >= GUARANTEE,
    boosts: [...boostChance.keys()],
    boostChances: [...boostChance.values()],
    chosenBoosts: chosen === null ? [] : chosen.modifiers.filter((row) => row.value > 1).map((row) => row.id),
  };
}

/** Nobody clears a region before moving on, so the DLC plays out of `region_level` order: a
 * player who reaches Farum Azula is already strong enough for the early DLC, and plays the late
 * DLC (its dragons, and Enir-Ilim after them) only once Haligtree and the Ashen Capital are open
 * (web/sim/README.md#A run). Unlisted regions keep their `region_level`. */
const DLC_ORDER: Readonly<Record<string, number>> = {
  dlc_gravesite: 116,
  dlc_shadowkeep: 117,
  dlc_abyssal: 118,
  dlc_jaggedpeak: 131,
  dlc_enirilim: 132,
};

/** One run's seed among several. Seeds differ by allocation too: with shared seeds every allocation rolls the same
 * bosses, classes and rules. */
export function runSeed(seed: number, allocation: Allocation, run: number): number {
  return (Math.imul(seed, 2654435761) + Math.imul(ALLOCATIONS.indexOf(allocation), 97_003) + run * 40503) | 0;
}

/** Every region in the order a run opens them. */
export function playOrder(database: Database): readonly string[] {
  return [...database.region]
    .sort((a, b) => (DLC_ORDER[a.id] ?? a.region_level) - (DLC_ORDER[b.id] ?? b.region_level))
    .map((row) => row.id);
}

export function simulateRun(base: Engine, options: SimOptions): RunResult {
  const observed: Observed[] = [];
  const engine: Engine = { ...base, observe: (slot, roll) => observed.push({ slot, roll }) };
  const database = engine.data.database;
  const order = playOrder(database).filter((id) => options.regions === null || options.regions.includes(id));
  const rank = new Map(playOrder(database).map((id, index) => [id, index]));
  const bosses = bossesByRegion(database);
  const regionOfBoss = bossRegions(database);
  const settings = {
    ...defaultSettings(database, engine.hyperparams),
    ...(options.allocation === "ITEMS" ? { maxStatGap: ITEMS_MAX_STAT_GAP } : {}),
    ...(options.characterClasses === null ? {} : { characterClasses: options.characterClasses }),
  };
  const player = newPlayer(options.allocation, DEFAULT_STATS);
  const result: RunResult = { options, rolls: [], objectives: [], finalStats: DEFAULT_STATS, offered: new Map() };

  let open = 1;
  const started = startRun(
    engine,
    { stats: DEFAULT_STATS, settings, regions: order.slice(0, open), weaponShortlist: [], deadBosses: [] },
    options.seed,
  );
  if (!started.ok) throw new Error(started.problems.join("; "));
  let run = started.run;
  let rolled = observed.splice(0);

  const record = (current: Run, rolls: readonly Observed[]) => {
    const objective = current.current!;
    const objectiveNumber = current.completed.length + 1;
    const region = order[open - 1]!;
    const level = derivedLevel(current.stats);
    result.objectives.push({
      objective: objectiveNumber,
      region,
      regionsOpen: open,
      level,
      stats: current.stats,
      boss: objective.boss,
      characterClass: objective.characterClass,
      slots: objective.slots,
    });
    const offered = result.offered.get(objective.characterClass) ?? new Set<string>();
    result.offered.set(objective.characterClass, offered);
    for (const one of rolls) {
      result.rolls.push({
        objective: objectiveNumber,
        region,
        level,
        characterClass: objective.characterClass,
        boss: objective.boss,
        slot: one.slot,
        ...describe(
          one,
          offered,
          options.chances !== undefined && CHANCE_SLOTS.includes(one.slot)
            ? (key, rolled) => {
                const at = chanceKey(objective.characterClass, one.slot, key, stretchOf(objectiveNumber));
                const sums = options.chances!.get(at) ?? { chance: 0, plain: 0, boosted: 0, rolls: 0 };
                sums.chance += rolled.chance;
                sums.plain += rolled.plain;
                sums.boosted += rolled.boosted;
                sums.rolls += 1;
                options.chances!.set(at, sums);
              }
            : undefined,
        ),
      });
    }
  };

  while (!run.finished) {
    if (run.current === null) {
      if (run.waiting !== null) {
        if (open >= order.length) break;
        open += 1;
        run = editRun(run, { regions: order.slice(0, open) });
      }
      run = rollNext(engine, run);
      rolled = observed.splice(0);
      continue;
    }
    record(run, rolled);
    if (options.allocation === "ITEMS") {
      meetRequirements(player, requirements(engine.data, run.current.slots));
    }
    // Nobody clears a region before moving on: the next one opens once `completion` of it is felled,
    // rounding up, rather than waiting for its last boss (web/sim/README.md#A run). This boss counts as
    // felled already: opened after `done`, a region's last boss would finish the run first.
    const felled = [...run.deadBosses.map((row) => row.instanceId), run.current.boss];
    while (open < order.length) {
      const region = order[open - 1]!;
      const total = bosses.get(region) ?? 0;
      const dead = felled.filter((id) => regionOfBoss.get(id) === region).length;
      if (total === 0 || dead * 100 < total * options.completion) break;
      open += 1;
      run = editRun(run, { regions: order.slice(0, open) });
    }
    run = done(engine, run);
    levelUp(player, { order, rank, open, completed: run.completed.length, bosses });
    run = editRun(run, { stats: { ...player.stats } });
  }
  return { ...result, finalStats: { ...player.stats } };
}
