// The page's tables as one Markdown file beside the dump (web/sim/README.md#Reading the dump): every number comes from
// the page's own counting in aggregate.ts, so a wide sample reads exactly as the page would read it.
import { copy } from "../src/copy";
import {
  className,
  FAIR_TABLES,
  fairLines,
  gap,
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
import { decimal, lineClasses, multiplier, percent, perRun, rowName, signedPerRun } from "../src/sim/format";

const words = copy.sim;

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
  ]);
  return [
    `### ${title}`,
    counted(perRun(shared.total / shared.runs)),
    table([nameLabel, columns.perRun, columns.share, ...(fair ? [columns.fair] : []), columns.seenIn], rows),
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

/** The lines whose gap from fair matters for play. */
function furthest(sample: Sample): string[] {
  const runs = sample.results.length;
  const worst = worstLines(fairLines(sample, FAIR_TABLES), runs);
  return [
    `### ${words.slots.furthest}`,
    words.slots.furthestLede(runs, worst.length),
    table(
      [columns.klass, columns.slot, columns.region, columns.perRun, columns.fairPerRun, columns.gap, columns.fair],
      worst.map((line) => [
        lineClasses(sample, line),
        words.slots[line.table],
        rowName({ key: line.key, name: line.region, ...(line.order === undefined ? {} : { order: line.order }) }),
        perRun(line.shown / runs),
        perRun(line.fair / runs),
        signedPerRun(gap(line) / runs),
        decimal(line.shown / line.fair),
      ]),
    ),
  ];
}

export function report(sample: Sample): string {
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
      [columns.what, columns.perRun, columns.apart, columns.soon, columns.pastLimit],
      repeats(sample).map((row) => [
        words.overview.repeatKinds[row.kind],
        perRun(row.perRun),
        decimal(row.gap, 1),
        percent(row.soon),
        percent(row.pastLimit),
      ]),
    ),
    `## ${words.tabs[1]}`,
    shares(`${words.slots.rh}, ${words.slots.byClass}`, handShares(sample, "rh", "class")),
    shares(`${words.slots.rh}, ${words.slots.byWeapon}`, handShares(sample, "rh", "weapon")),
    shares(`${words.slots.lh}, ${words.slots.byClass}`, handShares(sample, "lh", "class")),
    shares(`${words.slots.lh}, ${words.slots.byWeapon}`, handShares(sample, "lh", "weapon")),
    `### ${words.slots.pairs}`,
    both.sameClass.of > 0
      ? words.slots.sameClass(percent(both.sameClass.count / both.sameClass.of), perRun(both.sameClass.of / summary.runs))
      : "",
    table([words.slots.rhColumn, words.slots.lhColumn, columns.perRun, columns.share], both.rows.map((row) => [row.rh, row.lh, perRun(row.perRun), percent(row.share)])),
    shares(words.slots.spell, gearShares(sample, "spell")),
    shares(words.slots.weaponAsh, gearShares(sample, "weaponAsh")),
    shares(words.slots.shieldAsh, gearShares(sample, "shieldAsh")),
    shares(words.slots.item, gearShares(sample, "item")),
    shares(words.slots.talisman, gearShares(sample, "talisman")),
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
    shares(words.slots.armor, gearShares(sample, "armor")),
    ...REGION_TABLES.map((slot) =>
      shares(`${words.slots[slot]}, ${words.slots.byRegion}`, regionShares(sample, slot), columns.region),
    ),
    ...furthest(sample),
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
