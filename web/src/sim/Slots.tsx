import { useMemo } from "react";

import {
  className,
  FAIR_TABLES,
  empties,
  fairLines,
  gearShares,
  handShares,
  pairs,
  regionShares,
  ruleNone,
  THIN_SAMPLE,
  type EmptyRow,
  type GearTable,
  type PairRow,
  type RegionTable,
  type Sample,
  type ShareTable,
} from "../../sim/aggregate";
import type { ChanceSums } from "../../sim/simulate";
import { copy } from "../copy";
import { Cycler } from "../ui/Cycler";
import { DataTable } from "../ui/DataTable";
import { perRunColumn, shareColumn } from "./columns";
import { Section } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { FOLD, matches, percent, perRun } from "./format";
import type { SlotView } from "./inputs";
import { FurthestFromFair } from "./FurthestFromFair";
import { countOnce } from "./countOnce";
import { ShareSection } from "./ShareSection";

const words = copy.sim.slots;
const columns = copy.sim.columns;

export function Slots({
  sample,
  search,
  chances,
  by,
  onBy,
}: {
  readonly sample: Sample;
  readonly chances: ChanceSums;
  readonly search: string;
  readonly by: SlotView;
  readonly onBy: (by: SlotView) => void;
}) {
  const region = by === "region";
  // Counted once per sample and view; typing in the search only filters the rows
  const tables = useMemo(() => countOnce(sample, `slots:${by}`, () => {
    const byRegion = (table: RegionTable): ShareTable | null => regionShares(sample, table, chances);
    const count = (table: Exclude<GearTable, "rule">) => (region ? byRegion(table) : gearShares(sample, table, chances));
    const hand = (slot: "rh" | "lh") => (region ? byRegion(slot) : handShares(sample, slot, by === "class" ? "class" : "weapon", chances));
    return {
      rh: hand("rh"),
      lh: hand("lh"),
      spell: count("spell"),
      weaponAsh: count("weaponAsh"),
      shieldAsh: count("shieldAsh"),
      item: count("item"),
      talisman: count("talisman"),
      armor: count("armor"),
      rule: gearShares(sample, "rule"),
      both: pairs(sample),
      none: ruleNone(sample),
      empty: empties(sample),
    };
  }), [sample, chances, by, region]);
  // Each picked class alone, every slot but the item slot: counted only while the tables count by region
  const lines = useMemo(() => (region ? countOnce(sample, "fair-lines", () => fairLines(sample, FAIR_TABLES, chances)) : []), [sample, chances, region]);
  const regionLede = (table: RegionTable) => (twoSlots(table) ? `${words.regionLede} ${words.regionBothSlots}` : words.regionLede);
  const both = tables.both;
  const pairRows = both.rows.filter((row) => matches(row.name, search));
  const scale = Math.max(0, ...both.rows.map((row) => row.share));
  const dualWieldOnly = sample.classes.length === 1 && sample.classes[0] === "warrior_dw";
  const none = tables.none;
  const empty = tables.empty.filter((row) => matches(className(sample.data, row.characterClass), search));
  const emptyScale = Math.max(0, ...tables.empty.map((row) => row.share));
  const runs = sample.results.length;
  const gear = (table: Exclude<GearTable, "rule">, title: string, lede?: string) => (
    <ShareSection
      title={title}
      {...(region ? { lede: regionLede(table), nameLabel: columns.region } : lede === undefined ? {} : { lede })}
      control={<CountBy hands={false} by={by} onBy={onBy} />}
      table={tables[table]}
      search={search}
    />
  );
  return (
    <>
      {(["rh", "lh"] as const).map((slot) => (
        <ShareSection
          key={slot}
          title={words[slot]}
          lede={region ? regionLede(slot) : by === "class" ? words.handLede.class : words.handLede.weapon}
          {...(region ? { nameLabel: columns.region } : {})}
          control={<CountBy hands by={by} onBy={onBy} />}
          table={tables[slot]}
          search={search}
        />
      ))}

      {(search === "" || pairRows.length > 0) && (
        <Section
          title={words.pairs}
          lede={
            <>
              {`${words.pairsLede} ${copy.sim.counted(perRun(both.total / runs))}`}
              {both.sameClass.of > 0 && (
                <>
                  <br />
                  {words.sameClass(percent(both.sameClass.count / both.sameClass.of), perRun(both.sameClass.of / runs))}
                  {dualWieldOnly && ` ${words.dualWieldAim}`}
                </>
              )}
            </>
          }
        >
          <DataTable<PairRow>
            label={words.pairs}
            columns={[
              { id: "rh", label: words.rhColumn, sortValue: (row) => row.rh, render: (row) => row.rh },
              { id: "lh", label: words.lhColumn, sortValue: (row) => row.lh, render: (row) => row.lh },
              perRunColumn((row) => row.count),
              shareColumn(scale),
            ]}
            rows={pairRows}
            rowKey={(row) => row.key}
            fold={FOLD}
            faded={() => both.total < THIN_SAMPLE}
            initialSort="share"
            empty={copy.sim.nothing}
          />
        </Section>
      )}

      {gear("spell", words.spell)}
      {gear("weaponAsh", words.weaponAsh)}
      {gear("shieldAsh", words.shieldAsh)}
      {gear("item", words.item)}
      {gear("talisman", words.talisman, words.talismanLede)}
      <ShareSection title={words.rule} lede={words.ruleLede} table={tables.rule} search={search} />
      <Section title={words.ruleNone} lede={copy.sim.counted(perRun(none.total / runs))}>
        <div>
          <ListRow title={words.neither} value={percent(none.total === 0 ? NaN : none.neither / none.total)} />
          <ListRow title={words.one} value={percent(none.total === 0 ? NaN : none.one / none.total)} />
          <ListRow title={words.both} value={percent(none.total === 0 ? NaN : none.both / none.total)} />
        </div>
      </Section>

      {gear("armor", words.armor)}

      {region && <FurthestFromFair sample={sample} lines={lines} search={search} />}

      <Section title={words.empties} lede={words.emptiesLede}>
        <DataTable<EmptyRow>
          label={words.empties}
          columns={[
            {
              id: "class",
              label: columns.klass,
              sortValue: (row) => className(sample.data, row.characterClass),
              render: (row) => className(sample.data, row.characterClass),
            },
            { id: "slot", label: columns.slot, render: (row) => copy.sim.slotNames[row.slot] },
            perRunColumn((row) => row.count),
            shareColumn(emptyScale),
          ]}
          rows={empty}
          rowKey={(row) => `${row.characterClass}/${row.slot}`}
          fold={FOLD}
          initialSort="per-run"
          empty={words.noEmpties}
        />
      </Section>
    </>
  );
}

/** One switch for every table of items on the tab, so they always read the same way; the hands alone count by weapon
 * class. */
function CountBy({ hands, by, onBy }: { readonly hands: boolean; readonly by: SlotView; readonly onBy: (by: SlotView) => void }) {
  const options: { value: SlotView; label: string }[] = hands
    ? [
        { value: "class", label: words.byClass },
        { value: "item", label: words.byWeapon },
        { value: "region", label: words.byRegion },
      ]
    : [
        { value: "item", label: words.byItem },
        { value: "region", label: words.byRegion },
      ];
  return (
    <div className="sim-switch">
      <Cycler<SlotView> label={words.countBy} options={options} value={!hands && by === "class" ? "item" : by} onChange={onBy} />
    </div>
  );
}


const twoSlots = (table: RegionTable) => table === "weaponAsh" || table === "shieldAsh" || table === "talisman";
