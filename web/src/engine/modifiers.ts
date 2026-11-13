import type { Condition, Modifier, PoolSlot, RolledCondition, Selector } from "./database";
import { poolKey, type EngineData } from "./engineData";
import { matchesOption, type Option } from "./selectors";

/** A slot absent from `rolled` has not rolled yet; `null` means it rolled an empty result. */
export interface RollState {
  readonly characterClass: string;
  readonly boss: string | null;
  readonly rolled: ReadonlyMap<PoolSlot, string | null>;
}

const RULE_SLOTS: ReadonlySet<PoolSlot> = new Set(["rule_1", "rule_2"]);

/** An empty result and a slot the class has no row for both read as `none`. */
function rolledOption(data: EngineData, state: RollState, slot: PoolSlot): Option | "not_rolled" {
  const value = state.rolled.get(slot);
  if (value === undefined && data.pools.has(poolKey(state.characterClass, slot))) return "not_rolled";

  const id = value ?? "none";
  if (RULE_SLOTS.has(slot)) {
    const row = data.rules.get(id);
    if (row === undefined) throw new Error(`Unknown rule rolled: ${id}`);
    return { kind: "rule", row };
  }
  const row = data.items.get(id);
  if (row === undefined) throw new Error(`Unknown item rolled: ${id}`);
  return { kind: "item", row };
}

function bossMatches(selector: Selector, boss: string): boolean {
  return selector.kind === "boss" && (selector.ids === null || selector.ids.includes(boss));
}

/** A slot not rolled yet is inactive, whether the condition says "matches" or "does not". */
function holdsOn(
  data: EngineData,
  state: RollState,
  condition: RolledCondition,
  slot: PoolSlot | "boss",
): boolean {
  if (slot === "boss") {
    if (state.boss === null) return false;
    return bossMatches(condition.selector, state.boss) !== condition.negated;
  }
  const option = rolledOption(data, state, slot);
  if (option === "not_rolled") return false;
  return matchesOption(condition.selector, option) !== condition.negated;
}

function conditionHolds(data: EngineData, state: RollState, condition: Condition): boolean {
  if (condition.kind === "character_class") return condition.ids.includes(state.characterClass);
  return condition.slots.some((slot) => holdsOn(data, state, condition, slot));
}

export function activeModifiers(data: EngineData, state: RollState): readonly Modifier[] {
  return data.database.modifier.filter((row) =>
    row.when.every((condition) => conditionHolds(data, state, condition)),
  );
}
