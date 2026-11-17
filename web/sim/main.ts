import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { copy } from "../src/copy";
import type { Database, LoadoutSlot } from "../src/engine/database";
import { indexDatabase } from "../src/engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../src/engine/hyperparams";
import type { Engine } from "../src/engine/run";
import { STATS } from "../src/engine/settings";
import { LOADOUT_ORDER } from "../src/engine/loadout";
import { ALLOCATIONS, type Allocation } from "./player";
import { NO_LOCATION, REGION_TABLES, regionShares, sampleOf, vsFair } from "./aggregate";
import { report } from "./report";
import { playOrder, runSeed, simulateRun, type RunResult } from "./simulate";

const USAGE = `pnpm sim [--runs 20] [--allocations ITEMS,STR,DEX,INT,FTH,ARC,ALL] [--seed 1] [--no-dlc]
         [--regions limgrave,liurnia] [--completion 50] [--classes knight,jester]
         [--no-synergies] [--flat] [--out ../data/build/sim/<timestamp>]`;

/** Each run writes its own folder, so an earlier dump stays put while the next one is read. */
function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  // Milliseconds too, so two dumps started in the same second still get folders of their own
  return `${day}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

function csv(rows: readonly (readonly (string | number | boolean | null)[])[]): string {
  const cell = (value: string | number | boolean | null) => {
    if (value === null) return "";
    const text = typeof value === "number" && !Number.isInteger(value) ? value.toPrecision(6) : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\n") + "\n";
}

/** Every slot's regions with Vs fair (web/sim/README.md#Reading the dump), for the classes together (`all`) and for
 * each class alone, from the page's own counting over the same runs. */
function vsFairRows(engine: Engine, results: readonly RunResult[], classes: readonly string[]) {
  const rows: (string | number | null)[][] = [
    [
      "character_class", "slot", "region_number", "region", "per_run", "share", "fair_share", "vs_fair", "fair_per_run",
      "rollable_share", "vs_rollable",
    ],
  ];
  for (const scope of ["all", ...classes]) {
    const sample = sampleOf(engine.data, results, scope === "all" ? classes : [scope]);
    for (const table of REGION_TABLES) {
      const shares = regionShares(sample, table);
      if (shares === null) continue;
      for (const row of shares.rows) {
        const fair = row.adjusted ?? 0;
        rows.push([
          scope, table, row.order ?? null, row.key === NO_LOCATION ? copy.sim.slots.noLocation : row.name, row.perRun, row.share, fair,
          fair > 0 ? vsFair(row) : null, (fair * shares.total) / shares.runs,
          row.rollable ?? null, row.rollable ? row.share / row.rollable : null,
        ]);
      }
    }
  }
  return rows;
}

/** The database with every rule above or below ×1 at ×1 (removals kept), and with `flat` every item's and armor set's odds that aren't 0
 * at 1 too: catch-up judged alone, before odds and synergies steer single items. */
function judging(database: Database, noSynergies: boolean, flat: boolean): Database {
  if (!noSynergies) return database;
  const one = <T extends { readonly odds: number }>(row: T): T => (flat && row.odds !== 0 ? { ...row, odds: 1 } : row);
  return {
    ...database,
    modifier: database.modifier.map((row) => (row.value === 0 ? row : { ...row, value: 1 })),
    item: database.item.map(one),
    armor_set: database.armor_set.map(one),
  };
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
      "no-synergies": { type: "boolean", default: false },
      flat: { type: "boolean", default: false },
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

  const database = judging(
    JSON.parse(readFileSync(path.join(repo, "data/build/db.json"), "utf8")) as Database,
    values["no-synergies"] || values.flat,
    values.flat,
  );
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
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs takes a whole number from 1, not ${values.runs}`);
  const seed = Number(values.seed);
  if (!Number.isInteger(seed)) throw new Error(`--seed takes a whole number, not ${values.seed}`);
  const playing = values.classes?.split(",").map((one) => one.trim()) ?? null;
  const unknownClasses = (playing ?? []).filter((id) => !database.character_class.some((row) => row.id === id));
  if (unknownClasses.length > 0) throw new Error(`Unknown class ${unknownClasses.join(", ")}`);
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
          characterClasses: playing,
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
      ["allocation", "run", "objective", "region", "level", "character_class", "boss", "slot", "chosen", "chosen_key", "chance", "chosen_catch_up", "pool", "none_chance", "boosts", "boost_chances", "chosen_boosts"],
      ...results.flatMap((result, index) =>
        result.rolls.map((row) => [
          result.options.allocation, index, row.objective, row.region, row.level, row.characterClass, row.boss, row.slot,
          row.chosen ?? "(empty)", row.chosenKey, row.chance, row.catchUp, row.pool, row.noneChance,
          row.boosts.join(";"),
          row.boostChances.map((value) => value.toPrecision(4)).join(";"), row.chosenBoosts.join(";"),
        ]),
      ),
    ]),
  );
  const classes = playing ?? database.character_class.map((row) => row.id);
  writeFileSync(path.join(out, "metrics.md"), report(sampleOf(engine.data, results, classes)));
  writeFileSync(path.join(out, "vs-fair.csv"), csv(vsFairRows(engine, results, classes)));
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`${results.length} runs in ${seconds} s → ${path.relative(process.cwd(), out)}/metrics.md, vs-fair.csv, rolls.csv, objectives.csv`);
}
