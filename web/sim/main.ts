import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import type { Database, LoadoutSlot } from "../src/engine/database";
import { indexDatabase } from "../src/engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../src/engine/hyperparams";
import type { Engine } from "../src/engine/run";
import { STATS } from "../src/engine/settings";
import { LOADOUT_ORDER } from "../src/engine/loadout";
import { ALLOCATIONS, type Allocation } from "./player";
import { playOrder, runSeed, simulateRun, type RunResult } from "./simulate";

const USAGE = `pnpm sim [--runs 20] [--allocations ITEMS,STR,DEX,INT,FTH,ARC,ALL] [--seed 1] [--no-dlc]
         [--regions limgrave,liurnia] [--completion 50] [--classes knight,jester]
         [--out ../data/build/sim/<timestamp>]`;

/** Each run writes its own folder, so an earlier dump stays put while the next one is read. */
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
      allocations: { type: "string", default: ALLOCATIONS.join(",") },
      seed: { type: "string", default: "1" },
      "no-dlc": { type: "boolean", default: false },
      regions: { type: "string" },
      completion: { type: "string", default: "50" },
      classes: { type: "string" },
      out: { type: "string", default: path.join(repo, "data/build/sim", timestamp()) },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const allocations = values.allocations.split(",").map((one) => one.trim().toUpperCase());
  const unknown = allocations.filter((one) => !(ALLOCATIONS as readonly string[]).includes(one));
  if (unknown.length > 0) throw new Error(`Unknown allocation ${unknown.join(", ")}; use ${ALLOCATIONS.join(", ")}`);

  const database = JSON.parse(readFileSync(path.join(repo, "data/build/db.json"), "utf8")) as Database;
  const engine: Engine = { data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS };
  const regions = (values.regions?.split(",").map((one) => one.trim()) ?? playOrder(database)).filter(
    (id) => !values["no-dlc"] || !id.startsWith("dlc_"),
  );
  const unknownRegions = regions.filter((id) => !database.region.some((row) => row.id === id));
  if (unknownRegions.length > 0) throw new Error(`Unknown region ${unknownRegions.join(", ")}`);
  const completion = Number(values.completion);
  if (!Number.isInteger(completion) || completion < 1 || completion > 100) {
    throw new Error(`--completion takes a whole percentage from 1 to 100, not ${values.completion}`);
  }
  const runs = Number(values.runs);
  const seed = Number(values.seed);
  const started = performance.now();
  const results: RunResult[] = [];
  for (const allocation of allocations as Allocation[]) {
    for (let run = 0; run < runs; run += 1) {
      results.push(
        simulateRun(engine, {
          allocation,
          seed: runSeed(seed, allocation, run),
          regions,
          completion,
          characterClasses: values.classes === undefined ? null : values.classes.split(","),
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
      ["allocation", "run", "seed", "objective", "region", "regions_open", "level", ...STATS, "boss", "character_class", ...slots],
      ...results.flatMap((result, index) =>
        result.objectives.map((row) => [
          result.options.allocation, index, result.options.seed, row.objective, row.region, row.regionsOpen, row.level,
          ...STATS.map((stat) => row.stats[stat]), row.boss, row.characterClass,
          ...slots.map((slot) => (row.slots[slot] === undefined ? "" : (row.slots[slot] ?? "(empty)"))),
        ]),
      ),
    ]),
  );
  writeFileSync(
    path.join(out, "rolls.csv"),
    csv([
      ["allocation", "run", "objective", "region", "level", "character_class", "boss", "slot", "chosen", "chosen_key", "chance", "catch_up", "pool", "none_chance", "guaranteed_chance", "guaranteed_won", "boosts", "boost_chances", "chosen_boosts"],
      ...results.flatMap((result, index) =>
        result.rolls.map((row) => [
          result.options.allocation, index, row.objective, row.region, row.level, row.characterClass, row.boss, row.slot,
          row.chosen ?? "(empty)", row.chosenKey, row.chance, row.catchUp, row.pool, row.noneChance,
          row.guaranteedChance, row.guaranteedWon, row.boosts.join(";"),
          row.boostChances.map((value) => value.toPrecision(4)).join(";"), row.chosenBoosts.join(";"),
        ]),
      ),
    ]),
  );
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`${results.length} runs in ${seconds} s → ${path.relative(process.cwd(), out)}/rolls.csv, objectives.csv`);
}
