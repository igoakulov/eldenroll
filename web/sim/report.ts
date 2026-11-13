// The report's questions are listed in web/sim/README.md#Report
import type { LoadoutSlot } from "../src/engine/database";
import type { EngineData } from "../src/engine/engineData";
import { POOL_SLOTS } from "../src/engine/database";
import { STATS } from "../src/engine/settings";
import { slotOptions, repeatKey } from "../src/engine/slotRoll";
import type { Scenario } from "./player";
import type { ObjectiveRow, RollRow, RunResult } from "./simulate";

interface Obj {
  readonly scenario: Scenario;
  readonly run: number;
  readonly row: ObjectiveRow;
  readonly rolls: ReadonlyMap<LoadoutSlot, RollRow>;
}

const BUCKETS: readonly [number, number][] = [
  [1, 40],
  [41, 80],
  [81, 120],
  [121, 160],
  [161, 999],
];

const pct = (part: number, whole: number) => (whole === 0 ? "–" : `${((100 * part) / whole).toFixed(1)}%`);
const num = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : "–");
const mean = (values: readonly number[]) =>
  values.length === 0 ? NaN : values.reduce((sum, value) => sum + value, 0) / values.length;

function table(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n");
}

export function buildReport(data: EngineData, results: readonly RunResult[]): string {
  const scenarios = [...new Set(results.map((result) => result.options.scenario))];
  const objectives: Obj[] = [];
  results.forEach((result, run) => {
    const byObjective = new Map<number, Map<LoadoutSlot, RollRow>>();
    for (const roll of result.rolls) {
      if (!roll.kept) continue;
      const slots = byObjective.get(roll.objective) ?? new Map<LoadoutSlot, RollRow>();
      slots.set(roll.slot, roll);
      byObjective.set(roll.objective, slots);
    }
    for (const row of result.objectives) {
      if (!row.kept) continue;
      objectives.push({ scenario: result.options.scenario, run, row, rolls: byObjective.get(row.objective) ?? new Map() });
    }
  });
  const groups: readonly [string, readonly Obj[]][] = [
    ["All", objectives],
    ...scenarios.map((scenario) => [scenario, objectives.filter((one) => one.scenario === scenario)] as [string, Obj[]]),
  ];
  const name = (key: string | null): string => {
    if (key === null) return "(empty)";
    const [kind, id = ""] = key.split(/:(.*)/s) as [string, string];
    if (kind === "alias") return data.aliases.get(id)?.label ?? id;
    if (kind === "item") return data.items.get(id)?.name ?? id;
    if (kind === "rule") return `rule ${data.rules.get(id)?.name ?? id}`;
    if (kind === "armor_set") return data.armorSets.get(id)?.name ?? id;
    if (kind === "character_class") return data.database.character_class.find((row) => row.id === id)?.name ?? id;
    if (kind === "boss") return data.bosses.get(id)?.name ?? id;
    return key;
  };
  const className = (id: string) => name(`character_class:${id}`);
  const item = (roll: RollRow | undefined) =>
    roll?.chosen === null || roll?.chosen === undefined ? undefined : data.items.get(roll.chosen);

  /** Share of objectives showing each key, counted once per objective, by group. A slot with no
   * stat requirement (anything but a weapon, shield, sorcery or incantation) reads the same
   * whatever the player builds, so its table takes `singleColumn` to drop the per-scenario split. */
  const shares = (
    keysOf: (one: Obj) => readonly string[],
    limit = 25,
    filter: (one: Obj) => boolean = () => true,
    label: (key: string) => string = name,
    singleColumn = false,
  ): string => {
    const cols = singleColumn ? [groups[0]!] : groups;
    const counts = cols.map(([, list]) => {
      const counted = new Map<string, number>();
      const kept = list.filter(filter);
      for (const one of kept) for (const key of new Set(keysOf(one))) counted.set(key, (counted.get(key) ?? 0) + 1);
      return { counted, total: kept.length };
    });
    const all = counts[0]!;
    const keys = [...all.counted.keys()].sort((a, b) => all.counted.get(b)! - all.counted.get(a)!);
    const shown = limit > 0 ? keys.slice(0, limit) : keys;
    const rows = shown.map((key) => [label(key), ...counts.map(({ counted, total }) => pct(counted.get(key) ?? 0, total))]);
    const more = keys.length > shown.length ? `\n\n${keys.length - shown.length} more below the top ${limit}; the row dump has them.` : "";
    return `Out of ${all.total} objectives.\n\n${table(["", ...cols.map(([one]) => one)], rows)}${more}`;
  };

  const chosenKey = (slot: LoadoutSlot) => (one: Obj) => {
    const key = one.rolls.get(slot)?.chosenKey;
    return key === undefined ? [] : [key ?? "(empty)"];
  };
  const keysIn = (slots: readonly LoadoutSlot[], test: (roll: RollRow) => boolean = () => true) => (one: Obj) =>
    slots.flatMap((slot) => {
      const roll = one.rolls.get(slot);
      return roll !== undefined && roll.chosenKey !== null && test(roll) ? [roll.chosenKey] : [];
    });
  const out: string[] = ["# Simulation report", ""];
  const section = (title: string, ...body: string[]) => out.push(`## ${title}`, "", ...body.flatMap((one) => [one, ""]));

  // Runs
  section(
    "Runs",
    table(
      ["Scenario", "Runs", "Objectives per run", "Rerolls per run", "Final level", ...STATS],
      scenarios.map((scenario) => {
        const runs = results.filter((result) => result.options.scenario === scenario);
        const kept = runs.map((result) => result.objectives.filter((row) => row.kept));
        const finals = STATS.map((stat) => num(mean(runs.map((result) => result.finalStats[stat])), 0));
        const levels = runs.map((result) => STATS.reduce((sum, stat) => sum + result.finalStats[stat], 0) - 79);
        return [
          scenario,
          String(runs.length),
          num(mean(kept.map((rows) => rows.length)), 1),
          num(mean(runs.map((result) => result.objectives.filter((row) => !row.kept).length)), 1),
          num(mean(levels), 0),
          ...finals,
        ];
      }),
    ),
  );

  section(
    "Classes",
    "Classes don't decay, and no stat gates them, so one column.",
    shares((one) => [`character_class:${one.row.characterClass}`], 0, undefined, name, true),
  );

  const weaponClass = (slot: LoadoutSlot) => (one: Obj) => {
    const found = item(one.rolls.get(slot));
    return found === undefined ? [] : [found.subcategory ?? found.category];
  };

  /** Pools whose only possible result is `none`, whatever rolls: a bare pick, not an empty one,
   * so it needs no per-scenario split and no flag in "Empty results". */
  const alwaysNone = (characterClass: string, slot: LoadoutSlot): boolean => {
    const options = slotOptions(data, characterClass, slot);
    return options.length === 1 && options[0]!.row.id === "none";
  };

  /** Items in the class's own RH or LH pool, by subcategory: how many weapons compete for each
   * share, so "a bigger pool shows up more" can be told from "something else moved it". */
  const subcategoryCounts = (characterClass: string, slot: LoadoutSlot): ReadonlyMap<string, number> => {
    const counts = new Map<string, number>();
    for (const option of slotOptions(data, characterClass, slot)) {
      if (option.kind !== "item" || option.row.odds <= 0) continue;
      const key = option.row.subcategory ?? option.row.category;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };

  /** Every row, uncut, as `N% / M%`: `N%` is the observed share, `M%` the share it would have if
   * every subcategory held the same number of weapons — so a skew from pool size reads apart from
   * one from decay, stat gates or a modifier. */
  const weaponShares = (characterClass: string, slot: LoadoutSlot): string => {
    const counts = subcategoryCounts(characterClass, slot);
    const inClass = (one: Obj) => one.row.characterClass === characterClass;
    const columns = groups.map(([label, list]) => {
      const kept = list.filter(inClass);
      const counted = new Map<string, number>();
      for (const one of kept) {
        const key = weaponClass(slot)(one)[0];
        if (key !== undefined) counted.set(key, (counted.get(key) ?? 0) + 1);
      }
      const perItem = new Map(
        [...new Set([...counted.keys(), ...counts.keys()])].map((key) => [
          key,
          (counted.get(key) ?? 0) / Math.max(1, counts.get(key) ?? 1),
        ]),
      );
      const perItemTotal = [...perItem.values()].reduce((sum, value) => sum + value, 0);
      return { label, counted, total: kept.length, perItem, perItemTotal };
    });
    const all = columns[0]!;
    const keys = [...all.counted.keys()].sort((a, b) => all.counted.get(b)! - all.counted.get(a)!);
    const rows = keys.map((key) => [
      key,
      ...columns.map(({ counted, total, perItem, perItemTotal }) => {
        const n = pct(counted.get(key) ?? 0, total);
        if ((counts.get(key) ?? 0) === 0 || perItemTotal === 0) return n;
        const m = ((perItem.get(key) ?? 0) / perItemTotal) * 100;
        return `${n} / ${m.toFixed(1)}%`;
      }),
    ]);
    return `Out of ${all.total} objectives.\n\n${table(["", ...columns.map((one) => one.label)], rows)}`;
  };

  out.push("## By class", "");
  for (const characterClass of data.database.character_class) {
    const inClass = (one: Obj) => one.row.characterClass === characterClass.id;
    const heading = (title: string) => out.push(`#### ${title}`, "");
    out.push(`### ${characterClass.name}`, "");

    heading("Right hand");
    out.push(weaponShares(characterClass.id, "rh"), "");
    if (!alwaysNone(characterClass.id, "lh")) {
      heading("Left hand");
      out.push(weaponShares(characterClass.id, "lh"), "");
    }
    if (!alwaysNone(characterClass.id, "spell")) {
      heading("Spell");
      out.push(shares(chosenKey("spell"), 0, inClass), "");
    }
    heading("Talismans, either slot");
    out.push(shares(keysIn(["talisman_1", "talisman_2"]), 0, inClass, name, true), "");
    heading("Combat rules, either slot");
    out.push(shares(keysIn(["rule_1", "rule_2"]), 0, inClass, name, true), "");
  }

  const ashKind = (ashId: string): "weapon" | "shield" =>
    (data.ashFits.get(ashId) ?? []).some((row) => row.category === "shield") ? "shield" : "weapon";
  section("Ashes for weapons", shares(keysIn(["rh_ash", "lh_ash"], (roll) => ashKind(roll.chosen ?? "") === "weapon"), 0));
  section("Ashes for shields", shares(keysIn(["rh_ash", "lh_ash"], (roll) => ashKind(roll.chosen ?? "") === "shield"), 0));
  section("Item slot", shares(chosenKey("item"), 0));
  section("Armor sets", shares(chosenKey("armor"), 40));

  section(
    "How many rule slots show None",
    shares((one) => {
      const nones = ["rule_1", "rule_2"].filter((slot) => one.rolls.get(slot as LoadoutSlot)?.chosen === "none").length;
      return [["neither slot", "one slot", "both slots"][nones]!];
    }, 0, undefined, (key) => key, true),
    "Both slots can't show None: `rule_2` leaves out what `rule_1` rolled. No stat depends on it, so one column.",
  );

  // Never rolled
  const universe = new Set<string>();
  for (const characterClass of data.database.character_class) {
    for (const slot of [...POOL_SLOTS, "armor"] as LoadoutSlot[]) {
      for (const option of slotOptions(data, characterClass.id, slot)) {
        if (option.row.odds > 0) universe.add(repeatKey(option));
      }
    }
  }
  const offered = new Set(results.flatMap((result) => [...result.offered]));
  const chosen = new Set(results.flatMap((result) => result.rolls.filter((roll) => roll.kept).map((roll) => roll.chosenKey ?? "")));
  const neverChosen = [...universe].filter((key) => offered.has(key) && !chosen.has(key)).map(name).sort();
  const neverOffered = [...universe].filter((key) => !offered.has(key)).map(name).sort();
  section(
    "Never rolled",
    `In a pool at some point, never shown on a kept objective (${neverChosen.length}): ${neverChosen.join(", ") || "none"}.`,
    `Never in any pool, so out of reach under these settings (${neverOffered.length}): ${neverOffered.join(", ") || "none"}.`,
  );

  // Repeats
  const repeatKinds: readonly [string, (one: Obj) => readonly string[]][] = [
    ["Class", (one) => [`character_class:${one.row.characterClass}`]],
    ["Right hand", keysIn(["rh"], (roll) => roll.chosen !== "none")],
    ["Left hand", keysIn(["lh"], (roll) => roll.chosen !== "none")],
    ["Ash", keysIn(["rh_ash", "lh_ash"])],
    ["Spell", keysIn(["spell"])],
    ["Item slot", keysIn(["item"])],
    ["Talisman", keysIn(["talisman_1", "talisman_2"])],
    ["Rule other than None", keysIn(["rule_1", "rule_2"], (roll) => roll.chosen !== "none")],
    ["Armor set", keysIn(["armor"])],
  ];
  section(
    "Repeats",
    "Gap: objectives since the same thing last showed in that run. Soon: the share of showings that repeat one from the last 10 objectives.",
    table(
      ["", ...groups.flatMap(([group]) => [`${group} gap`, `${group} soon`])],
      repeatKinds.map(([label, keysOf]) => [
        label,
        ...groups.flatMap(([, list]) => {
          const gaps: number[] = [];
          let showings = 0;
          const last = new Map<string, number>();
          let runKey = "";
          for (const one of list) {
            const thisRun = `${one.scenario}/${one.run}`;
            if (thisRun !== runKey) {
              last.clear();
              runKey = thisRun;
            }
            for (const key of new Set(keysOf(one))) {
              showings += 1;
              const before = last.get(key);
              if (before !== undefined) gaps.push(one.row.objective - before);
              last.set(key, one.row.objective);
            }
          }
          return [num(mean(gaps), 1), pct(gaps.filter((gap) => gap <= 10).length, showings)];
        }),
      ]),
    ),
  );

  // Empty results
  const empties = new Map<string, number>();
  for (const one of objectives) {
    for (const [slot, roll] of one.rolls) {
      if (roll.chosen !== null) continue;
      if (alwaysNone(one.row.characterClass, slot)) continue;
      const key = `${className(one.row.characterClass)} ${slot}`;
      empties.set(key, (empties.get(key) ?? 0) + 1);
    }
  }
  section(
    "Empty results",
    "A class and slot whose only possible roll is `none` is left out: an empty result there is a bare pick, not a gap.",
    empties.size === 0
      ? "None: every other slot found something to roll."
      : table(["Class and slot", "Empty rolls", "Share of all objectives"], [...empties].sort((a, b) => b[1] - a[1]).map(([key, count]) => [key, String(count), pct(count, objectives.length)])),
  );

  // Dual-Wield Warrior
  const dualWield = (one: Obj) => one.row.characterClass === "warrior_dw";
  const pairing = (one: Obj) => {
    const rh = item(one.rolls.get("rh"));
    const lh = item(one.rolls.get("lh"));
    if (rh === undefined || rh.id === "none") return "RH empty";
    if (lh === undefined || lh.id === "none") return "LH empty: a paired weapon";
    if (lh.category !== "weapon") return "LH not a weapon";
    return lh.subcategory === rh.subcategory ? "same weapon class" : "different weapon classes";
  };
  section(
    "Dual-Wield Warrior",
    shares((one) => [pairing(one)], 0, dualWield, (key) => key),
    `Same-class share, of objectives with a weapon in each hand: ${groups
      .map(([group, list]) => {
        const kinds = list.filter(dualWield).map(pairing);
        const same = kinds.filter((kind) => kind === "same weapon class").length;
        return `${group} ${pct(same, same + kinds.filter((kind) => kind === "different weapon classes").length)}`;
      })
      .join(", ")}. Counting a paired weapon as a same-class pair: ${groups
      .map(([group, list]) => {
        const kinds = list.filter(dualWield).map(pairing);
        const same = kinds.filter((kind) => kind === "same weapon class" || kind.startsWith("LH empty")).length;
        return `${group} ${pct(same, kinds.filter((kind) => kind !== "RH empty" && kind !== "LH not a weapon").length)}`;
      })
      .join(", ")}.`,
    "Whether LH is heavier than RH can't be told: the database holds no weights.",
    "Top RH + LH class pairs, when they differ:",
    shares(
      (one) => {
        if (pairing(one) !== "different weapon classes") return [];
        return [`${item(one.rolls.get("rh"))?.subcategory} + ${item(one.rolls.get("lh"))?.subcategory}`];
      },
      20,
      (one) => dualWield(one) && pairing(one) === "different weapon classes",
      (key) => key,
    ),
  );

  // Jester right hand
  const regionLevel = new Map(data.database.region.map((row) => [row.id, row.region_level]));
  const level = (id: string) => regionLevel.get(id) ?? 0;
  const jester = (limit: number) => (one: Obj) => one.row.characterClass === "jester" && level(one.row.region) < limit;
  section(
    "Jester right hand",
    "Before Altus Plateau opens:",
    shares(chosenKey("rh"), 0, jester(level("altus"))),
    "Before Leyndell opens:",
    shares(chosenKey("rh"), 0, jester(level("leyndell"))),
    "Whole run:",
    shares(chosenKey("rh"), 0, jester(Infinity)),
  );

  // Decay of none
  const bucketRows = (rows: readonly { objective: number; values: readonly number[] }[], width: number) =>
    BUCKETS.map(([from, to]) => {
      const inside = rows.filter((row) => row.objective >= from && row.objective <= to);
      return [`${from}–${to === 999 ? "end" : to}`, String(inside.length), ...Array.from({ length: width }, (_, index) => num(mean(inside.map((row) => row.values[index]!)), 3))];
    });
  const nonePools = new Map<string, { objective: number; values: number[] }[]>();
  for (const one of objectives) {
    for (const [slot, roll] of one.rolls) {
      if (roll.noneChance === null) continue;
      const key = slot.startsWith("rule") ? `rule None, ${slot}` : `${className(one.row.characterClass)} ${slot}`;
      const list = nonePools.get(key) ?? [];
      list.push({ objective: one.row.objective, values: [roll.noneChance, roll.noneChanceNoDecay ?? 0, roll.noneDecay ?? 1] });
      nonePools.set(key, list);
    }
  }
  section(
    "Decay of none",
    "Every pool that holds `none` (the rule `None` for rule slots), by objective number: its chance with decay, without, and the decay multiplier on it. All scenarios together.",
    "Pools where `none` is the only option are left out: decay can't move them.",
    ...[...nonePools]
      .filter(([, rows]) => rows.some((row) => row.values[1]! < 1))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => `### ${key}\n\n${table(["Objectives", "Rolls", "Chance", "Chance without decay", "Decay"], bucketRows(rows, 3))}`),
  );

  // Decay drift
  const driftBySlot = new Map<string, { objective: number; values: number[] }[]>();
  for (const one of objectives) {
    for (const [slot, roll] of one.rolls) {
      const list = driftBySlot.get(slot) ?? [];
      list.push({ objective: one.row.objective, values: [roll.drift] });
      driftBySlot.set(slot, list);
    }
  }
  section(
    "Decay drift",
    "How far decay moves each pool from its odds: half the summed difference between the chances with decay and without, from 0 (no change) to 1. All scenarios together. Classes don't decay, so they're left out.",
    table(
      ["Slot", ...BUCKETS.map(([from, to]) => `${from}–${to === 999 ? "end" : to}`)],
      [...POOL_SLOTS, "armor" as const].map((slot) => {
        const rows = driftBySlot.get(slot) ?? [];
        return [slot, ...BUCKETS.map(([from, to]) => num(mean(rows.filter((row) => row.objective >= from && row.objective <= to).map((row) => row.values[0]!)), 3))];
      }),
    ),
  );

  // Boosts
  const boostStats = new Map<string, { active: number; won: number; chance: number[]; wonChance: number[] }>();
  for (const one of objectives) {
    for (const roll of one.rolls.values()) {
      roll.boosts.forEach((id, index) => {
        const stats = boostStats.get(id) ?? { active: 0, won: 0, chance: [], wonChance: [] };
        stats.active += 1;
        stats.chance.push(roll.boostChances[index]!);
        if (roll.chosenBoosts.includes(id)) {
          stats.won += 1;
          stats.wonChance.push(roll.chance);
        }
        boostStats.set(id, stats);
      });
    }
  }
  const modifierValue = new Map(data.database.modifier.map((row) => [row.id, row.value]));
  const boostRows = (test: (value: number) => boolean) =>
    data.database.modifier
      .filter((row) => test(row.value))
      .map((row) => {
        const stats = boostStats.get(row.id);
        if (stats === undefined) return [row.id, String(row.value), "0", "–", "–", "–", "–"];
        const low = stats.chance.filter((chance) => chance < 0.99).length;
        return [
          row.id,
          String(modifierValue.get(row.id)),
          String(stats.active),
          pct(stats.won, stats.active),
          num(mean(stats.chance), 4),
          num(Math.min(...stats.chance), 4),
          test(10_000) ? pct(low, stats.active) : num(mean(stats.wonChance), 4),
        ];
      });
  section(
    "Guarantees",
    "Every modifier at ×10,000 or more. Active: rolls where it boosted an option in the pool. Chance: the boosted options' summed chance at roll time. Acceptance is 99% where one top target is in play.",
    table(["Modifier", "×", "Active", "Won", "Mean chance", "Lowest chance", "Rolls under 99%"], boostRows((value) => value >= 10_000)),
  );
  section(
    "Other boosts",
    "Every modifier above ×1 and under ×10,000, read the same way; the last column is the chance an option it boosted had when it won.",
    table(["Modifier", "×", "Active", "Won", "Mean chance", "Lowest chance", "Chance on wins"], boostRows((value) => value > 1 && value < 10_000)),
  );

  // Planned synergies
  const active = (one: Obj, id: string) => [...one.rolls.values()].some((roll) => roll.boosts.includes(id));
  const won = (one: Obj, id: string) => [...one.rolls.values()].some((roll) => roll.chosenBoosts.includes(id));
  const chains: readonly [string, readonly string[]][] = [
    ["Bleed → blood talisman → White Mask set", ["bleed_boosts_blood_exultation", "blood_exultation_boosts_white_mask_sets"]],
    ["Rot or poison → rot talisman → Mushroom Crown set", ["rot_boosts_kindred_exultation", "kindred_exultation_boosts_mushroom_sets"]],
    ["Claw Talisman → Jump attacks only → jump set", ["claw_talisman_makes_jump_attacks_top", "jump_attacks_rule_boosts_jump_sets"]],
    ["Dancer's weapon → Dancer's set", ["dancers_weapon_makes_dancers_set_top"]],
    ["Blue Dancer Charm → light set", ["blue_dancer_charm_boosts_light_sets"]],
    ["Blue Dancer Charm → No armor", ["blue_dancer_charm_boosts_no_armor"]],
  ];
  section(
    "Planned synergies",
    "For each step: objectives where the step's trigger was in place, and how often its target then rolled.",
    table(
      ["Synergy", "Step", ...groups.flatMap(([group]) => [`${group} triggered`, `${group} landed`])],
      chains.flatMap(([label, steps]) =>
        steps.map((id, index) => [
          index === 0 ? label : "",
          id,
          ...groups.flatMap(([, list]) => {
            const triggered = list.filter((one) => active(one, id));
            return [String(triggered.length), pct(triggered.filter((one) => won(one, id)).length, triggered.length)];
          }),
        ]),
      ),
    ),
  );

  // Synergy talismans out of place
  const talismanShown = (one: Obj, id: string) =>
    (["talisman_1", "talisman_2"] as const).map((slot) => one.rolls.get(slot)).find((roll) => roll?.chosen === id);
  const outside: readonly [string, string, (one: Obj) => boolean][] = [
    ["Lord of Blood's Exultation", "lord_of_bloods_exultation", (one) => (talismanShown(one, "lord_of_bloods_exultation")?.chosenBoosts.length ?? 0) === 0],
    ["Kindred of Rot's Exultation", "kindred_of_rots_exultation", (one) => (talismanShown(one, "kindred_of_rots_exultation")?.chosenBoosts.length ?? 0) === 0],
    ["Blue Dancer Charm, armor neither a light set nor the Naked Set by its boost", "blue_dancer_charm", (one) => {
      const armor = one.rolls.get("armor");
      return !(armor?.chosenBoosts.some((id) => id.startsWith("blue_dancer_charm_boosts")) ?? false);
    }],
    ["Claw Talisman, no Jump attacks only", "claw_talisman", (one) => !won(one, "claw_talisman_makes_jump_attacks_top")],
    ["Axe Talisman, no charged rule", "axe_talisman", (one) => !won(one, "axe_talisman_makes_charged_rules_top")],
  ];
  section(
    "Synergy talismans out of place",
    "Of the objectives showing the talisman, the share where its synergy didn't hold: for the exultations, no boost brought the talisman in.",
    table(
      ["Talisman", ...groups.flatMap(([group]) => [`${group} shown`, `${group} out of place`])],
      outside.map(([label, id, test]) => [
        label,
        ...groups.flatMap(([, list]) => {
          const shown = list.filter((one) => talismanShown(one, id) !== undefined);
          return [String(shown.length), pct(shown.filter(test).length, shown.length)];
        }),
      ]),
    ),
  );

  return out.join("\n");
}
