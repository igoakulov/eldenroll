import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import type { Database, LoadoutSlot } from "../src/engine/database";
import { indexDatabase } from "../src/engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../src/engine/hyperparams";
import type { Engine } from "../src/engine/run";
import { STATS } from "../src/engine/settings";
import { LOADOUT_ORDER } from "../src/engine/loadout";
import { SCENARIOS, type Scenario } from "./player";
import { buildReport } from "./report";
import { simulateRun, type RunResult } from "./simulate";

const USAGE = `pnpm sim [--runs 20] [--scenarios ITEMS,STR,DEX,INT,FTH,ARC,ALL] [--seed 1] [--no-dlc]
         [--classes knight,jester] [--reroll-every 3] [--out ../data/build/sim/<timestamp>]`;

/** Each run writes its own folder, so an earlier report stays put while the next one is read. */
function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function csv(rows: readonly (readonly (string | number | boolean | null)[])[]): string {
  const cell = (value: string | number | boolean | null) => {
    if (value === null) return "";
    const text = typeof value === "number" && !Number.isInteger(value) ? value.toPrecision(6) : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\n") + "\n";
}

export function main(argv: readonly string[], repo: string): void {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      runs: { type: "string", default: "20" },
      scenarios: { type: "string", default: SCENARIOS.join(",") },
      seed: { type: "string", default: "1" },
      "no-dlc": { type: "boolean", default: false },
      classes: { type: "string" },
      "reroll-every": { type: "string", default: "3" },
      out: { type: "string", default: path.join(repo, "data/build/sim", timestamp()) },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const scenarios = values.scenarios.split(",").map((one) => one.trim().toUpperCase());
  const unknown = scenarios.filter((one) => !(SCENARIOS as readonly string[]).includes(one));
  if (unknown.length > 0) throw new Error(`Unknown scenario ${unknown.join(", ")}; use ${SCENARIOS.join(", ")}`);

  const database = JSON.parse(readFileSync(path.join(repo, "data/build/db.json"), "utf8")) as Database;
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  const runs = Number(values.runs);
  const seed = Number(values.seed);
  const started = performance.now();
  const results: RunResult[] = [];
  for (const scenario of scenarios as Scenario[]) {
    for (let run = 0; run < runs; run += 1) {
      // Seeds differ by scenario too: with shared seeds every scenario rolls the same bosses, classes and rules
      const runSeed = (Math.imul(seed, 2654435761) + Math.imul(SCENARIOS.indexOf(scenario), 97_003) + run * 40503) | 0;
      results.push(
        simulateRun(engine, {
          scenario,
          seed: runSeed,
          dlc: !values["no-dlc"],
          characterClasses: values.classes === undefined ? null : values.classes.split(","),
          rerollEvery: Number(values["reroll-every"]),
        }),
      );
    }
  }

  const out = path.resolve(values.out);
  mkdirSync(out, { recursive: true });
  const slots: readonly LoadoutSlot[] = LOADOUT_ORDER;
  writeFileSync(
    path.join(out, "objectives.csv"),
    csv([
      ["scenario", "run", "seed", "objective", "kept", "region", "regions_open", "level", ...STATS, "boss", "character_class", ...slots],
      ...results.flatMap((result, index) =>
        result.objectives.map((row) => [
          result.options.scenario, index, result.options.seed, row.objective, row.kept, row.region, row.regionsOpen, row.level,
          ...STATS.map((stat) => row.stats[stat]), row.boss, row.characterClass,
          ...slots.map((slot) => (row.slots[slot] === undefined ? "" : (row.slots[slot] ?? "(empty)"))),
        ]),
      ),
    ]),
  );
  writeFileSync(
    path.join(out, "rolls.csv"),
    csv([
      ["scenario", "run", "objective", "kept", "region", "level", "character_class", "boss", "slot", "chosen", "chosen_key", "chance", "chance_no_decay", "decay", "pool", "none_chance", "none_chance_no_decay", "none_decay", "guaranteed_chance", "guaranteed_won", "drift", "boosts", "boost_chances", "chosen_boosts"],
      ...results.flatMap((result, index) =>
        result.rolls.map((row) => [
          result.options.scenario, index, row.objective, row.kept, row.region, row.level, row.characterClass, row.boss, row.slot,
          row.chosen ?? "(empty)", row.chosenKey, row.chance, row.chanceNoDecay, row.decay, row.pool, row.noneChance, row.noneChanceNoDecay,
          row.noneDecay, row.guaranteedChance, row.guaranteedWon, row.drift, row.boosts.join(";"),
          row.boostChances.map((value) => value.toPrecision(4)).join(";"), row.chosenBoosts.join(";"),
        ]),
      ),
    ]),
  );
  const header = [
    `Arguments: ${argv.join(" ") || "(defaults)"}. ${runs} runs per scenario, seed ${seed}, DLC ${values["no-dlc"] ? "off" : "on"}, a full-objective reroll every ${values["reroll-every"]} objectives.`,
    "",
  ].join("\n");
  writeFileSync(path.join(out, "report.md"), buildReport(engine.data, results).replace("\n\n", `\n\n${header}\n`));
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`${results.length} runs in ${seconds} s → ${path.relative(process.cwd(), out)}/report.md, rolls.csv, objectives.csv`);
}
