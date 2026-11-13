// How a simulated player spends a level (web/sim/README.md#The simulated player)
import type { Database, Item } from "../src/engine/database";
import type { RolledSlots } from "../src/engine/display";
import type { EngineData } from "../src/engine/engineData";
import { MAX_STAT, type Stat, type Stats } from "../src/engine/settings";

export const SCENARIOS = ["ITEMS", "STR", "DEX", "INT", "FTH", "ALL"] as const;
export type Scenario = (typeof SCENARIOS)[number];

const ITEM_STATS = ["str", "dex", "int", "fth", "arc"] as const satisfies readonly Stat[];
type ItemStat = (typeof ITEM_STATS)[number];

export const ITEMS_MAX_STAT_GAP = 5;

/** Each window holds every target before it too; `until` is the region whose opening ends it. */
interface BaseWindow {
  readonly until: string | null;
  readonly targets: Partial<Record<Stat, number>>;
}

const BASE_WINDOWS: readonly BaseWindow[] = [
  { until: "liurnia", targets: { vig: 20, mind: 15 } },
  { until: "leyndell", targets: { vig: 30, mind: 15, end: 25 } },
  { until: "farumazula", targets: { vig: 40, mind: 15, end: 25 } },
  { until: null, targets: { vig: 60, mind: 20, end: 25 } },
];

/** One step of a build: raise these to their targets, the first lowest first, before the next step. */
interface BuildStep {
  readonly targets: Partial<Record<ItemStat, number>>;
  /** Every `every`-th point goes to these in turn instead. */
  readonly aside?: { readonly every: number; readonly stats: readonly ItemStat[] };
}

const BUILDS: Readonly<Record<Exclude<Scenario, "ITEMS">, readonly BuildStep[]>> = {
  STR: [
    { targets: { str: 54 } },
    { targets: { dex: 20 } },
    { targets: { fth: 25 } },
    { targets: { str: 67 }, aside: { every: 4, stats: ["dex", "int", "arc"] } },
  ],
  DEX: [{ targets: { str: 20 } }, { targets: { dex: 80 } }, { targets: { fth: 25 } }],
  INT: [{ targets: { int: 80 } }],
  FTH: [{ targets: { fth: 80 } }],
  ALL: [],
};

export interface PlayerState {
  readonly scenario: Scenario;
  stats: Record<Stat, number>;
  /** ITEMS keeps unspent levels until a rolled item needs them. */
  bank: number;
  window: number;
  windowRate: number;
  windowCredit: number;
  asideCount: number;
}

export function newPlayer(scenario: Scenario, stats: Stats): PlayerState {
  return { scenario, stats: { ...stats }, bank: 0, window: -1, windowRate: 0, windowCredit: 0, asideCount: 0 };
}

/** Boss counts by region, to know how many levels are left before a region opens. */
export function bossesByRegion(database: Database): ReadonlyMap<string, number> {
  const regionOf = new Map(database.location.map((row) => [row.id, row.region_id]));
  const counts = new Map<string, number>();
  for (const boss of database.boss_instance) {
    if (boss.odds <= 0) continue;
    const region = regionOf.get(boss.location_id);
    if (region !== undefined) counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return counts;
}

export interface Progress {
  /** The run's regions in opening order. */
  readonly order: readonly string[];
  /** How many are open. */
  readonly open: number;
  /** Objectives completed, this one included. */
  readonly completed: number;
  readonly bosses: ReadonlyMap<string, number>;
}

function levelsBefore(progress: Progress, until: string | null): number {
  const end = until === null ? progress.order.length : progress.order.indexOf(until);
  const regions = progress.order.slice(0, end === -1 ? progress.order.length : end);
  return regions.reduce((sum, region) => sum + (progress.bosses.get(region) ?? 0), 0);
}

function windowIndex(progress: Progress): number {
  const opened = new Set(progress.order.slice(0, progress.open));
  const index = BASE_WINDOWS.findIndex((window) => window.until === null || !opened.has(window.until));
  return index === -1 ? BASE_WINDOWS.length - 1 : index;
}

function baseNeed(player: PlayerState, window: BaseWindow): number {
  return Object.entries(window.targets).reduce(
    (sum, [stat, target]) => sum + Math.max(0, target - player.stats[stat as Stat]),
    0,
  );
}

/** Base stats are paced evenly across their window, so they rise beside the build, not in a burst. */
function takesBasePoint(player: PlayerState, progress: Progress): Stat | null {
  const index = windowIndex(progress);
  const window = BASE_WINDOWS[index]!;
  const need = baseNeed(player, window);
  if (need === 0) return null;
  const left = Math.max(1, levelsBefore(progress, window.until) - progress.completed + 1);
  if (index !== player.window) {
    player.window = index;
    player.windowRate = Math.min(1, need / left);
    player.windowCredit = 0;
  }
  player.windowCredit += player.windowRate;
  if (player.windowCredit < 1 - 1e-9 && need < left) return null;
  player.windowCredit = Math.max(0, player.windowCredit - 1);
  let best: Stat | null = null;
  let bestGap = 0;
  for (const [stat, target] of Object.entries(window.targets) as [Stat, number][]) {
    const gap = target - player.stats[stat];
    if (gap > bestGap) {
      best = stat;
      bestGap = gap;
    }
  }
  return best;
}

function lowestItemStat(player: PlayerState): ItemStat | null {
  let best: ItemStat | null = null;
  for (const stat of ITEM_STATS) {
    if (player.stats[stat] >= MAX_STAT) continue;
    if (best === null || player.stats[stat] < player.stats[best]) best = stat;
  }
  return best;
}

function buildPoint(player: PlayerState, scenario: Exclude<Scenario, "ITEMS">): ItemStat | null {
  for (const step of BUILDS[scenario]) {
    const open = (Object.entries(step.targets) as [ItemStat, number][]).filter(
      ([stat, target]) => player.stats[stat] < target,
    );
    if (open.length === 0) continue;
    if (step.aside !== undefined) {
      player.asideCount += 1;
      if (player.asideCount % step.aside.every === 0) {
        const turn = Math.floor(player.asideCount / step.aside.every) - 1;
        const stat = step.aside.stats[turn % step.aside.stats.length]!;
        if (player.stats[stat] < MAX_STAT) return stat;
      }
    }
    return open[0]![0];
  }
  return lowestItemStat(player);
}

function raise(player: PlayerState, stat: Stat): void {
  player.stats[stat] = Math.min(MAX_STAT, player.stats[stat] + 1);
}

/** One level for one felled boss. */
export function levelUp(player: PlayerState, progress: Progress): void {
  const base = takesBasePoint(player, progress);
  if (base !== null) return raise(player, base);
  if (player.scenario === "ITEMS") {
    player.bank += 1;
    return;
  }
  const stat = buildPoint(player, player.scenario);
  if (stat !== null) raise(player, stat);
}

const WIELDED = ["rh", "lh", "spell"] as const;

/** What each stat must reach to wield the objective's gear; Strength counts two-handing. */
export function requirements(data: EngineData, slots: RolledSlots): Record<ItemStat, number> {
  const needs: Record<ItemStat, number> = { str: 0, dex: 0, int: 0, fth: 0, arc: 0 };
  const lh = slots.lh;
  const lhEmpty = lh === undefined || lh === null || lh === "none";
  for (const slot of WIELDED) {
    const id = slots[slot];
    if (id === undefined || id === null) continue;
    const item: Item | undefined = data.items.get(id);
    if (item === undefined) continue;
    const twoHanded = slot === "rh" && lhEmpty && item.str_bonus_2h === true;
    for (const stat of ITEM_STATS) {
      const need = stat === "str" && twoHanded ? Math.ceil(item.str / 1.5) : item[stat];
      needs[stat] = Math.max(needs[stat], need);
    }
  }
  return needs;
}

/** ITEMS: spends saved levels to meet the gear exactly, the largest gap first. */
export function meetRequirements(player: PlayerState, needs: Record<ItemStat, number>): void {
  while (player.bank > 0) {
    let best: ItemStat | null = null;
    let bestGap = 0;
    for (const stat of ITEM_STATS) {
      const gap = needs[stat] - player.stats[stat];
      if (gap > bestGap) {
        best = stat;
        bestGap = gap;
      }
    }
    if (best === null) return;
    raise(player, best);
    player.bank -= 1;
  }
}
