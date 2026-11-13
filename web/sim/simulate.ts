// One full run from `Start run` until every boss is felled (web/sim/README.md#A run)
import type { LoadoutSlot } from "../src/engine/database";
import type { RolledSlots } from "../src/engine/display";
import { done, editRun, reroll, rollNext, startRun, type Engine, type Run } from "../src/engine/run";
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
  type Scenario,
} from "./player";

export interface SimOptions {
  readonly scenario: Scenario;
  readonly seed: number;
  readonly dlc: boolean;
  readonly characterClasses: readonly string[] | null;
  /** A full-objective reroll on every n-th objective; 0 never rerolls. */
  readonly rerollEvery: number;
}

/** A boost this large or more is a guarantee (`data/balance.md#Tiers`). */
export const GUARANTEE = 10_000;

export interface RollRow {
  readonly objective: number;
  /** `false` for a roll a reroll replaced. */
  readonly kept: boolean;
  readonly region: string;
  readonly level: number;
  readonly characterClass: string;
  readonly boss: string;
  readonly slot: LoadoutSlot;
  readonly chosen: string | null;
  readonly chosenKey: string | null;
  readonly chance: number;
  /** The same option's chance with every decay removed. */
  readonly chanceNoDecay: number;
  /** The decay multiplier on the chosen option. */
  readonly decay: number;
  readonly pool: number;
  readonly noneChance: number | null;
  readonly noneChanceNoDecay: number | null;
  readonly noneDecay: number | null;
  /** Summed chance of options boosted ×10,000 or more, if any. */
  readonly guaranteedChance: number | null;
  readonly guaranteedWon: boolean;
  /** Ids of boosting modifiers (×>1) active on any option in the pool. */
  readonly boosts: readonly string[];
  /** Summed chance of the options each boost hits, in `boosts` order. */
  readonly boostChances: readonly number[];
  /** The chosen option's boosting modifiers. */
  readonly chosenBoosts: readonly string[];
  /** Half the summed difference between the pool with decay and without: 0 none, 1 all. */
  readonly drift: number;
}

export interface ObjectiveRow {
  readonly objective: number;
  readonly kept: boolean;
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
  /** Every option key any pool offered, to tell "never rolled" from "never in reach". */
  readonly offered: Set<string>;
}

function boostOf(row: WeightedOption): number {
  return row.modifiers.reduce((product, modifier) => product * modifier.value, 1);
}

function decayOf(row: WeightedOption): number {
  const plain = row.option.row.odds * boostOf(row);
  return plain > 0 ? row.weight / plain : 1;
}

interface Observed {
  readonly slot: LoadoutSlot;
  readonly roll: SlotRoll;
}

function describe(observed: Observed, offered: Set<string>) {
  const { roll } = observed;
  const options = roll.options;
  const total = options.reduce((sum, row) => sum + row.weight, 0);
  const plain = options.map((row) => row.option.row.odds * boostOf(row));
  const plainTotal = plain.reduce((sum, value) => sum + value, 0);
  let drift = 0;
  let none: { chance: number; plain: number; decay: number } | null = null;
  let guaranteed = 0;
  let hasGuaranteed = false;
  const boostChance = new Map<string, number>();
  options.forEach((row, index) => {
    offered.add(repeatKey(row.option));
    const chance = row.weight / total;
    const chancePlain = plain[index]! / plainTotal;
    drift += Math.abs(chance - chancePlain) / 2;
    if (row.option.kind !== "armor_set" && row.option.row.id === "none") {
      none = { chance, plain: chancePlain, decay: decayOf(row) };
    }
    if (boostOf(row) >= GUARANTEE) {
      hasGuaranteed = true;
      guaranteed += chance;
    }
    for (const modifier of row.modifiers) {
      if (modifier.value > 1) boostChance.set(modifier.id, (boostChance.get(modifier.id) ?? 0) + chance);
    }
  });
  const chosen = roll.chosen;
  const chosenIndex = chosen === null ? -1 : options.indexOf(chosen);
  const noneRow = none as { chance: number; plain: number; decay: number } | null;
  return {
    chosen: chosen?.option.row.id ?? null,
    chosenKey: chosen === null ? null : repeatKey(chosen.option),
    chance: roll.probability,
    chanceNoDecay: chosenIndex === -1 ? 0 : plain[chosenIndex]! / plainTotal,
    decay: chosen === null ? 1 : decayOf(chosen),
    pool: roll.pool,
    noneChance: noneRow?.chance ?? null,
    noneChanceNoDecay: noneRow?.plain ?? null,
    noneDecay: noneRow?.decay ?? null,
    guaranteedChance: hasGuaranteed ? guaranteed : null,
    guaranteedWon: chosen !== null && boostOf(chosen) >= GUARANTEE,
    boosts: [...boostChance.keys()],
    boostChances: [...boostChance.values()],
    chosenBoosts: chosen === null ? [] : chosen.modifiers.filter((row) => row.value > 1).map((row) => row.id),
    drift,
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

export function simulateRun(base: Engine, options: SimOptions): RunResult {
  const observed: Observed[] = [];
  const engine: Engine = { ...base, observe: (slot, roll) => observed.push({ slot, roll }) };
  const database = engine.data.database;
  const order = [...database.region]
    .filter((row) => options.dlc || !row.name.startsWith("DLC: "))
    .sort((a, b) => (DLC_ORDER[a.id] ?? a.region_level) - (DLC_ORDER[b.id] ?? b.region_level))
    .map((row) => row.id);
  const bosses = bossesByRegion(database);
  const regionOfBoss = bossRegions(database);
  const settings = {
    ...defaultSettings(database, engine.hyperparams),
    ...(options.scenario === "ITEMS" ? { maxStatGap: ITEMS_MAX_STAT_GAP } : {}),
    ...(options.characterClasses === null ? {} : { characterClasses: options.characterClasses }),
  };
  const player = newPlayer(options.scenario, DEFAULT_STATS);
  const result: RunResult = { options, rolls: [], objectives: [], finalStats: DEFAULT_STATS, offered: new Set() };

  let open = 1;
  const started = startRun(
    engine,
    { stats: DEFAULT_STATS, settings, regions: order.slice(0, open), weaponShortlist: [], deadBosses: [] },
    options.seed,
  );
  if (!started.ok) throw new Error(started.problems.join("; "));
  let run = started.run;
  let rolled = observed.splice(0);

  const record = (current: Run, kept: boolean, rolls: readonly Observed[]) => {
    const objective = current.current!;
    const objectiveNumber = current.completed.length + 1;
    const region = order[open - 1]!;
    const level = derivedLevel(current.stats);
    result.objectives.push({
      objective: objectiveNumber,
      kept,
      region,
      regionsOpen: open,
      level,
      stats: current.stats,
      boss: objective.boss,
      characterClass: objective.characterClass,
      slots: objective.slots,
    });
    for (const one of rolls) {
      result.rolls.push({
        objective: objectiveNumber,
        kept,
        region,
        level,
        characterClass: objective.characterClass,
        boss: objective.boss,
        slot: one.slot,
        ...describe(one, result.offered),
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
    const number = run.completed.length + 1;
    if (options.rerollEvery > 0 && number % options.rerollEvery === 0 && run.current.rerolls.length === 0) {
      record(run, false, rolled);
      run = reroll(engine, run, "boss");
      rolled = observed.splice(0);
      if (run.current === null) continue;
    }
    record(run, true, rolled);
    if (options.scenario === "ITEMS") {
      meetRequirements(player, requirements(engine.data, run.current.slots));
    }
    run = done(engine, run);
    // Nobody clears a region before moving on: the next one opens once this one is half felled,
    // rounding up, rather than waiting for its last boss (web/sim/README.md#A run).
    while (open < order.length) {
      const region = order[open - 1]!;
      const total = bosses.get(region) ?? 0;
      const dead = run.deadBosses.filter((row) => regionOfBoss.get(row.instanceId) === region).length;
      if (total === 0 || dead * 2 < total) break;
      open += 1;
      run = editRun(run, { regions: order.slice(0, open) });
    }
    levelUp(player, { order, open, completed: run.completed.length, bosses });
    run = editRun(run, { stats: { ...player.stats } });
  }
  return { ...result, finalStats: { ...player.stats } };
}
