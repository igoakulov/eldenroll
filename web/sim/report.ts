// The page's tables as one Markdown file beside the dump (web/sim/README.md#Reading the dump): every number comes from
// the page's own counting in aggregate.ts, so a wide sample reads exactly as the page would read it.
import { copy } from "../src/copy";
import {
  className,
  FAIR_TABLES,
  fairLines,
  worstLines,
  classShares,
  empties,
  gearShares,
  handShares,
  neverRolled,
  outsideSynergy,
  pairs,
  REGION_TABLES,
  regionShares,
  repeats,
  ruleNone,
  runSummary,
  synergyWins,
  type Sample,
  type ShareTable,
  type SynergyRow,
  vsFair,
} from "./aggregate";
import { STATS } from "../src/engine/settings";
import { decimal, multiplier, percent, perRun, rowName } from "../src/sim/format";
import type { ChanceSums } from "./simulate";

const words = copy.sim;

// The page's own formats, so a number reads the same in both
const times = (value: number | null) => (value === null ? "–" : words.items.times(multiplier(value)));

function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.map((cell) => cell.replaceAll("|", "/")).join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

const columns = words.columns;

function shares(title: string, shared: ShareTable | null, nameLabel: string = columns.name): string {
  if (shared === null) return "";
  const counted = shared.unit === "showings" ? words.countedShowings : words.counted;
  const fair = shared.rows.some((row) => row.adjusted !== undefined);
  const rows = shared.rows.map((row) => [
    rowName(row),
    perRun(row.perRun),
    percent(row.share),
    ...(fair ? [decimal(vsFair(row))] : []),
    percent(row.seenIn, 0),
    times(row.boost),
  ]);
  return [
    `### ${title}`,
    counted(perRun(shared.total / shared.runs)),
    table([nameLabel, columns.perRun, columns.share, ...(fair ? [columns.fair] : []), columns.seenIn, columns.catchUp], rows),
  ].join("\n\n");
}

function synergies(title: string, share: string, rows: readonly SynergyRow[]): string {
  return [
    `### ${title}`,
    table(
      [words.synergies.id, columns.boost, share, columns.perRun],
      rows.map((row) => [row.modifier.id, words.synergies.times(multiplier(row.modifier.value)), percent(row.share), perRun(row.perRun)]),
    ),
  ].join("\n\n");
}

/** The lines furthest from fair. */
function furthest(sample: Sample, chances: ChanceSums | undefined): string[] {
  const worst = worstLines(fairLines(sample, FAIR_TABLES, chances));
  return [
    `### ${words.slots.furthest}`,
    table(
      [columns.klass, columns.slot, columns.region, columns.fair, columns.fairPerRun],
      worst.map((line) => [
        className(sample.data, line.characterClass),
        words.slots[line.table],
        rowName({ key: line.key, name: line.region, ...(line.order === undefined ? {} : { order: line.order }) }),
        decimal(line.vsFair),
        perRun(line.fairPerRun),
      ]),
    ),
  ];
}

export function report(sample: Sample, chances: ChanceSums | undefined): string {
  const summary = runSummary(sample);
  const none = ruleNone(sample);
  const both = pairs(sample);
  const never = neverRolled(sample);
  const sections = [
    `# Simulation metrics`,
    `${words.overview.runsCount(summary.runs)}. ${words.overview.perRun}: ${words.overview.objectives} ${decimal(summary.objectives, 1)}, ` +
      `${words.overview.level} ${decimal(summary.level, 0)}, ` +
      STATS.map((stat) => `${stat} ${decimal(summary.stats[stat], 0)}`).join(", ") +
      ".",
    `## ${words.tabs[0]}`,
    shares(words.overview.classes, classShares(sample)),
    `### ${words.overview.repeats}`,
    table(
      [columns.what, columns.perRun, columns.gap, columns.soon],
      repeats(sample).map((row) => [words.overview.repeatKinds[row.kind], perRun(row.perRun), decimal(row.gap, 1), percent(row.soon)]),
    ),
    `## ${words.tabs[1]}`,
    shares(`${words.slots.rh}, ${words.slots.byClass}`, handShares(sample, "rh", "class", chances)),
    shares(`${words.slots.rh}, ${words.slots.byWeapon}`, handShares(sample, "rh", "weapon", chances)),
    shares(`${words.slots.lh}, ${words.slots.byClass}`, handShares(sample, "lh", "class", chances)),
    shares(`${words.slots.lh}, ${words.slots.byWeapon}`, handShares(sample, "lh", "weapon", chances)),
    `### ${words.slots.pairs}`,
    both.sameClass.of > 0
      ? words.slots.sameClass(percent(both.sameClass.count / both.sameClass.of), perRun(both.sameClass.of / summary.runs))
      : "",
    table([words.slots.rhColumn, words.slots.lhColumn, columns.perRun, columns.share], both.rows.map((row) => [row.rh, row.lh, perRun(row.perRun), percent(row.share)])),
    shares(words.slots.spell, gearShares(sample, "spell", chances)),
    shares(words.slots.weaponAsh, gearShares(sample, "weaponAsh", chances)),
    shares(words.slots.shieldAsh, gearShares(sample, "shieldAsh", chances)),
    shares(words.slots.item, gearShares(sample, "item", chances)),
    shares(words.slots.talisman, gearShares(sample, "talisman", chances)),
    shares(words.slots.rule, gearShares(sample, "rule")),
    `### ${words.slots.ruleNone}`,
    table(
      [columns.what, columns.share],
      [
        [words.slots.neither, percent(none.neither / none.total)],
        [words.slots.one, percent(none.one / none.total)],
        [words.slots.both, percent(none.both / none.total)],
      ],
    ),
    shares(words.slots.armor, gearShares(sample, "armor", chances)),
    ...REGION_TABLES.map((slot) =>
      shares(`${words.slots[slot]}, ${words.slots.byRegion}`, regionShares(sample, slot, chances), columns.region),
    ),
    ...furthest(sample, chances),
    `### ${words.slots.empties}`,
    table(
      [columns.klass, columns.slot, columns.perRun, columns.share],
      empties(sample).map((row) => [className(sample.data, row.characterClass), words.slotNames[row.slot], perRun(row.perRun), percent(row.share)]),
    ),
    `## ${words.tabs[2]}`,
    synergies(words.synergies.wins, words.synergies.won, synergyWins(sample)),
    synergies(words.synergies.outside, words.synergies.without, outsideSynergy(sample)),
    `## ${words.tabs[3]}`,
    `### ${words.items.inReach} (${never.inReach.length})`,
    never.inReach.join(", "),
    `### ${words.items.outOfReach} (${never.outOfReach.length})`,
    never.outOfReach.join(", "),
  ];
  return sections.filter((section) => section !== "").join("\n\n") + "\n";
}
