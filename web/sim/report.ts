// The page's tables as one Markdown file beside the dump (web/sim/README.md#Reading the dump): every number comes from
// the page's own counting in aggregate.ts, so a wide sample reads exactly as the page would read it.
import { copy } from "../src/copy";
import {
  className,
  classShares,
  empties,
  gearShares,
  handShares,
  NO_LOCATION,
  neverRolled,
  outsideSynergy,
  pairs,
  regionShares,
  repeats,
  ruleNone,
  runSummary,
  synergyWins,
  type RegionTable,
  type Sample,
  type ShareTable,
  type SynergyRow,
} from "./aggregate";
import { STATS } from "../src/engine/settings";

const words = copy.simulate;

const percent = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "–");
const decimal = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "–");
const times = (value: number | null) => (value === null ? "–" : `×${value < 10 ? value.toFixed(2) : Math.round(value)}`);

function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.map((cell) => cell.replaceAll("|", "/")).join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

function shares(title: string, shared: ShareTable | null): string {
  if (shared === null) return "";
  const unit = shared.unit === "showings" ? "showings" : "objectives";
  const ticked = shared.rows.some((row) => row.adjusted !== undefined);
  const rows = shared.rows.map((row) => [
    row.key === NO_LOCATION && row.name === NO_LOCATION ? words.slots.noLocation : row.name,
    decimal(row.perRun),
    percent(row.share),
    ...(ticked ? [percent(row.adjusted ?? 0)] : []),
    percent(row.seenIn),
    times(row.boost),
  ]);
  return [
    `### ${title}`,
    `Out of ${decimal(shared.total / shared.runs)} ${unit} per run.`,
    table(["Name", "Per run", "Share", ...(ticked ? ["Tick"] : []), "Runs", "Catch-up"], rows),
  ].join("\n\n");
}

function synergies(title: string, rows: readonly SynergyRow[]): string {
  return [
    `### ${title}`,
    table(
      ["Id", "Boost", "Share", "Per run"],
      rows.map((row) => [row.modifier.id, `×${row.modifier.value}`, percent(row.share), decimal(row.perRun)]),
    ),
  ].join("\n\n");
}

const REGION_TABLES: readonly [RegionTable, string][] = [
  ["rh", words.slots.rh],
  ["lh", words.slots.lh],
  ["spell", words.slots.spell],
  ["weaponAsh", words.slots.weaponAsh],
  ["shieldAsh", words.slots.shieldAsh],
  ["item", words.slots.item],
  ["talisman", words.slots.talisman],
  ["armor", words.slots.armor],
];

export function report(sample: Sample, chances: Parameters<typeof gearShares>[2]): string {
  const summary = runSummary(sample);
  const none = ruleNone(sample);
  const both = pairs(sample);
  const never = neverRolled(sample);
  const sections = [
    `# Simulation metrics`,
    `${summary.runs} runs, ${decimal(summary.objectives)} objectives and final level ${decimal(summary.level)} each on average; ` +
      STATS.map((stat) => `${stat} ${decimal(summary.stats[stat])}`).join(", ") +
      ".",
    `## ${words.tabs[0]}`,
    shares(words.overview.classes, classShares(sample)),
    `### ${words.overview.repeats}`,
    table(
      ["What", "Per run", "Gap", "Within 10"],
      repeats(sample).map((row) => [words.overview.repeatKinds[row.kind], decimal(row.perRun), decimal(row.gap), percent(row.soon)]),
    ),
    `## ${words.tabs[1]}`,
    shares(`${words.slots.rh}, ${words.slots.byClass}`, handShares(sample, "rh", "class", chances)),
    shares(`${words.slots.rh}, ${words.slots.byWeapon}`, handShares(sample, "rh", "weapon", chances)),
    shares(`${words.slots.lh}, ${words.slots.byClass}`, handShares(sample, "lh", "class", chances)),
    shares(`${words.slots.lh}, ${words.slots.byWeapon}`, handShares(sample, "lh", "weapon", chances)),
    `### ${words.slots.pairs}`,
    both.sameClass.of > 0
      ? words.slots.sameClass(percent(both.sameClass.count / both.sameClass.of), decimal(both.sameClass.of / summary.runs))
      : "",
    table(["Right hand", "Left hand", "Per run", "Share"], both.rows.map((row) => [row.rh, row.lh, decimal(row.perRun), percent(row.share)])),
    shares(words.slots.spell, gearShares(sample, "spell", chances)),
    shares(words.slots.weaponAsh, gearShares(sample, "weaponAsh", chances)),
    shares(words.slots.shieldAsh, gearShares(sample, "shieldAsh", chances)),
    shares(words.slots.item, gearShares(sample, "item", chances)),
    shares(words.slots.talisman, gearShares(sample, "talisman", chances)),
    shares(words.slots.rule, gearShares(sample, "rule")),
    `### ${words.slots.ruleNone}`,
    table(
      ["Slots showing None", "Share"],
      [
        [words.slots.neither, percent(none.neither / none.total)],
        [words.slots.one, percent(none.one / none.total)],
        [words.slots.both, percent(none.both / none.total)],
      ],
    ),
    shares(words.slots.armor, gearShares(sample, "armor", chances)),
    ...REGION_TABLES.map(([slot, title]) => shares(`${title}, ${words.slots.byRegion}`, regionShares(sample, slot, chances))),
    `### ${words.slots.empties}`,
    table(
      ["Class", "Slot", "Per run", "Share"],
      empties(sample).map((row) => [className(sample.data, row.characterClass), words.slotNames[row.slot], decimal(row.perRun), percent(row.share)]),
    ),
    `## ${words.tabs[2]}`,
    synergies(words.synergies.wins, synergyWins(sample)),
    synergies(words.synergies.outside, outsideSynergy(sample)),
    `## ${words.tabs[3]}`,
    `### ${words.items.inReach} (${never.inReach.length})`,
    never.inReach.join(", "),
    `### ${words.items.outOfReach} (${never.outOfReach.length})`,
    never.outOfReach.join(", "),
  ];
  return sections.filter((section) => section !== "").join("\n\n") + "\n";
}
