import { copy } from "../copy";
import type { Region } from "../engine/database";
import { MAX_STAT, MIN_STAT, STATS, correctedStat, type Stat, type Stats } from "../engine/settings";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { Stepper } from "../ui/Stepper";

export const STAT_NAMES: Readonly<Record<Stat, string>> = copy.statsAndRegions.stats;

const DLC_PREFIX = "DLC: ";

/** The 8 stats on Start and `Level up`. Given `before`, a stat above it shows raised. */
export function StatSteppers({
  stats,
  before,
  onStats,
}: {
  readonly stats: Stats;
  readonly before?: Stats;
  readonly onStats: (stats: Stats) => void;
}) {
  return (
    <div>
      {STATS.map((stat) => (
        <Stepper
          key={stat}
          id={`stat-${stat}`}
          label={STAT_NAMES[stat]}
          value={stats[stat]}
          min={MIN_STAT}
          max={MAX_STAT}
          correct={correctedStat}
          raised={before !== undefined && stats[stat] > before[stat]}
          onChange={(value) => onStats({ ...stats, [stat]: value })}
        />
      ))}
    </div>
  );
}

export function byLevel(regions: readonly Region[]): readonly Region[] {
  return [...regions].sort((a, b) => a.region_level - b.region_level);
}

/** One region's checkbox. The selection is kept in region order, whatever order the boxes are ticked in. */
export function RegionCheck({
  region,
  regions,
  selected,
  onRegions,
  className,
}: {
  readonly region: Region;
  readonly regions: readonly Region[];
  readonly selected: readonly string[];
  readonly onRegions: (regions: readonly string[]) => void;
  readonly className?: string;
}) {
  const dlc = region.name.startsWith(DLC_PREFIX);
  return (
    <LozengeCheckbox
      checked={selected.includes(region.id)}
      onChange={(checked) =>
        onRegions(
          checked
            ? byLevel(regions)
                .filter((r) => r.id === region.id || selected.includes(r.id))
                .map((r) => r.id)
            : selected.filter((id) => id !== region.id),
        )
      }
      {...(dlc ? { tag: copy.statsAndRegions.dlc } : {})}
      {...(className === undefined ? {} : { className })}
    >
      {dlc ? region.name.slice(DLC_PREFIX.length) : region.name}
    </LozengeCheckbox>
  );
}
