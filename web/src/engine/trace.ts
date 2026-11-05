import type { Condition, Modifier, PoolSlot } from "./database";
import type { RolledSlots } from "./display";
import type { EngineData } from "./engineData";
import {
  optionKey,
  type Removed,
  type Repetition,
  type SlotRoll,
} from "./slotRoll";

export type TraceSlot = "boss" | "build" | PoolSlot;

export interface TraceBlock {
  readonly slot: TraceSlot;
  readonly text: string;
}

export const TRACE_LABELS: Readonly<Record<TraceSlot, string>> = {
  boss: "Boss",
  build: "Build",
  rh: "RH",
  rh_ash: "RH ash",
  lh: "LH",
  lh_ash: "LH ash",
  spell: "Spell",
  item: "Item",
  talisman_1: "Talisman 1",
  talisman_2: "Talisman 2",
  rule_1: "Rule 1",
  rule_2: "Rule 2",
};

const REMOVAL_LABELS: readonly [Exclude<keyof Removed, "byModifier">, string][] = [
  ["neverRoll", "never roll"],
  ["notInRegion", "not in region"],
  ["bossStillAlive", "boss still alive"],
  ["statReq", "stat req"],
];

/** Only probabilities use %, so a weight below 1 can't be mistaken for a chance. */
export function formatMultiplier(value: number): string {
  if (value === 0) return "x0";
  if (value >= 10) return `x${Math.round(value)}`;
  return `x${Number(value.toPrecision(2))}`;
}

export function formatProbability(probability: number): string {
  return `${Number((probability * 100).toPrecision(3))}%`;
}

function repeatLine(key: string, repetition: Repetition): string | null {
  const count = repetition.seen[key] ?? 0;
  if (count === 0) return null;
  const total = formatMultiplier(repetition.decay ** count);
  return `  repeat: x${repetition.decay}^${count} = ${total}`;
}

export interface RolledContext {
  readonly boss: string | null;
  readonly build: string;
  readonly slots: RolledSlots;
}

function rolledName(data: EngineData, rolled: RolledContext, slot: TraceSlot): string {
  if (slot === "boss") return data.bosses.get(rolled.boss ?? "")?.name ?? "none";
  if (slot === "build") return data.database.build.find((row) => row.id === rolled.build)?.name ?? "none";
  const id = rolled.slots[slot];
  if (id === null || id === undefined) return "none";
  const row = slot === "rule_1" || slot === "rule_2" ? data.rules.get(id) : data.items.get(id);
  return row?.name ?? id;
}

/** Names what a modifier read, such as `Claw Talisman` or `RH katana`. */
function conditionLabel(data: EngineData, rolled: RolledContext, condition: Condition): string | null {
  if (condition.kind === "build") return null;
  const { slot, selector } = condition;
  if (selector.kind === "subcategory" || selector.kind === "category") {
    const id = rolled.slots[slot as PoolSlot];
    const item = id === null || id === undefined ? undefined : data.items.get(id);
    const value = selector.kind === "subcategory" ? item?.subcategory : item?.category;
    return `${TRACE_LABELS[slot]} ${(value ?? "none").replaceAll("_", " ")}`;
  }
  return rolledName(data, rolled, slot);
}

function modifierLabel(data: EngineData, rolled: RolledContext, modifier: Modifier): string {
  const labels = modifier.when
    .map((condition) => conditionLabel(data, rolled, condition))
    .filter((label): label is string => label !== null);
  return labels.length > 0 ? labels.join(" + ") : rolledName(data, rolled, "build");
}

export function slotTrace(
  data: EngineData,
  slot: PoolSlot,
  roll: SlotRoll,
  rolled: RolledContext,
  repetition: Repetition,
): TraceBlock {
  const lines = [`${TRACE_LABELS[slot]}: ${rolledName(data, rolled, slot)}`];
  lines.push(`  pool${roll.upgraded ? " (upgraded)" : ""}: ${roll.pool}`);
  if (roll.total !== roll.pool) lines.push(`    total pool: ${roll.total}`);
  for (const [key, label] of REMOVAL_LABELS) {
    if (roll.removed[key] > 0) lines.push(`    ${label}: -${roll.removed[key]}`);
  }
  for (const [id, count] of roll.removed.byModifier) {
    lines.push(`    ${id.replaceAll("_", " ")}: -${count}`);
  }
  const chosen = roll.chosen;
  if (chosen === null) {
    lines.push("  prob: 0%");
    return { slot, text: lines.join("\n") };
  }
  lines.push(`  odds: ${chosen.option.row.odds}`);
  for (const modifier of chosen.modifiers) {
    lines.push(`  ${modifierLabel(data, rolled, modifier)}: ${formatMultiplier(modifier.value)}`);
  }
  const repeat = repeatLine(optionKey(chosen.option), repetition);
  if (repeat !== null) lines.push(repeat);
  lines.push(`  prob: ${formatProbability(roll.probability)}`);
  return { slot, text: lines.join("\n") };
}

export interface PickTrace {
  readonly heading: string;
  readonly pool: number;
  readonly odds: number;
  readonly repeat: string | null;
  readonly probability: number;
}

export function pickTrace(slot: "boss" | "build", pick: PickTrace): TraceBlock {
  const lines = [`${TRACE_LABELS[slot]}: ${pick.heading}`, `  pool: ${pick.pool}`, `  odds: ${pick.odds}`];
  if (pick.repeat !== null) lines.push(pick.repeat);
  lines.push(`  prob: ${formatProbability(pick.probability)}`);
  return { slot, text: lines.join("\n") };
}

export function buildRepeatLine(build: string, repetition: Repetition): string | null {
  return repeatLine(`build:${build}`, repetition);
}

export function formatTrace(blocks: readonly TraceBlock[]): string {
  return blocks.map((block) => block.text).join("\n");
}
