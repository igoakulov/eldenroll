import { useMemo } from "react";

import {
  className,
  empties,
  gearShares,
  handShares,
  NO_LOCATION,
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
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading, SectionNote } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { FOLD, matches, percent, perRun } from "./format";
import type { SlotView } from "./inputs";
import { ShareSection } from "./ShareSection";

const words = copy.simulate.slots;
const columns = copy.simulate.columns;

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
  const tables = useMemo(() => {
    const byRegion = (table: RegionTable): ShareTable | null => named(regionShares(sample, table, chances));
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
  }, [sample, chances, by, region]);
  const both = tables.both;
  const pairRows = both.rows.filter((row) => matches(row.name, search));
  const scale = Math.max(0, ...both.rows.map((row) => row.share));
  const dualWieldOnly = sample.classes.length === 1 && sample.classes[0] === "warrior_dw";
  const none = tables.none;
  const empty = tables.empty;
  const runs = sample.results.length;
  const gear = (table: Exclude<GearTable, "rule">, title: string, lede?: string) => (
    <ShareSection
      title={title}
      {...(region
        ? { lede: twoSlots(table) ? `${words.regionLede} ${words.regionBothSlots}` : words.regionLede, nameLabel: columns.region }
        : lede === undefined
          ? {}
          : { lede })}
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
          lede={region ? words.regionLede : by === "class" ? words.handLede.class : words.handLede.weapon}
          {...(region ? { nameLabel: columns.region } : {})}
          control={<CountBy hands by={by} onBy={onBy} />}
          table={tables[slot]}
          search={search}
        />
      ))}

      {(search === "" || pairRows.length > 0) && (
        <section className="simulate-section">
          <SectionHeading>{words.pairs}</SectionHeading>
          <SectionNote>
            {`${words.pairsLede} ${copy.simulate.counted(perRun(both.total / runs))}`}
            {both.sameClass.of > 0 && (
              <>
                <br />
                {words.sameClass(percent(both.sameClass.count / both.sameClass.of), perRun(both.sameClass.of / runs))}
                {dualWieldOnly && ` ${words.dualWieldAim}`}
              </>
            )}
          </SectionNote>
          <DataTable<PairRow>
            label={words.pairs}
            columns={[
              { id: "rh", label: words.rhColumn, sortValue: (row) => row.rh, render: (row) => row.rh },
              { id: "lh", label: words.lhColumn, sortValue: (row) => row.lh, render: (row) => row.lh },
              { id: "per-run", label: columns.perRun, numeric: true, sortValue: (row) => row.count, render: (row) => perRun(row.perRun) },
              {
                id: "share",
                label: columns.share,
                numeric: true,
                sortValue: (row) => row.share,
                render: (row) => <ShareBar share={row.share} scale={scale} text={percent(row.share)} />,
              },
            ]}
            rows={pairRows}
            rowKey={(row) => row.key}
            fold={FOLD}
            faded={() => both.total < THIN_SAMPLE}
            initialSort="share"
            empty={copy.simulate.nothing}
          />
        </section>
      )}

      {gear("spell", words.spell)}
      {gear("weaponAsh", words.weaponAsh)}
      {gear("shieldAsh", words.shieldAsh)}
      {gear("item", words.item)}
      {gear("talisman", words.talisman, words.talismanLede)}
      <ShareSection title={words.rule} lede={words.ruleLede} table={tables.rule} search={search} />
      <section className="simulate-section">
        <SectionHeading>{words.ruleNone}</SectionHeading>
        <SectionNote>{copy.simulate.counted(perRun(none.total / runs))}</SectionNote>
        <div className="simulate-rows">
          <ListRow title={words.neither} value={percent(none.total === 0 ? NaN : none.neither / none.total)} />
          <ListRow title={words.one} value={percent(none.total === 0 ? NaN : none.one / none.total)} />
          <ListRow title={words.both} value={percent(none.total === 0 ? NaN : none.both / none.total)} />
        </div>
      </section>

      {gear("armor", words.armor)}

      <section className="simulate-section">
        <SectionHeading>{words.empties}</SectionHeading>
        <SectionNote>{words.emptiesLede}</SectionNote>
        <DataTable<EmptyRow>
          label={words.empties}
          columns={[
            {
              id: "class",
              label: columns.klass,
              sortValue: (row) => className(sample.data, row.characterClass),
              render: (row) => className(sample.data, row.characterClass),
            },
            { id: "slot", label: columns.slot, render: (row) => copy.simulate.slotNames[row.slot] },
            { id: "per-run", label: columns.perRun, numeric: true, sortValue: (row) => row.count, render: (row) => perRun(row.perRun) },
            {
              id: "share",
              label: columns.share,
              numeric: true,
              sortValue: (row) => row.share,
              render: (row) => (
                <ShareBar share={row.share} scale={Math.max(...empty.map((one) => one.share))} text={percent(row.share)} />
              ),
            },
          ]}
          rows={empty}
          rowKey={(row) => `${row.characterClass}/${row.slot}`}
          fold={FOLD}
          initialSort="per-run"
          empty={words.noEmpties}
        />
      </section>
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
    <div className="simulate-switch">
      <Cycler<SlotView> label={words.countBy} options={options} value={!hands && by === "class" ? "item" : by} onChange={onBy} />
    </div>
  );
}

function named(table: ShareTable | null): ShareTable | null {
  if (table === null) return null;
  return { ...table, rows: table.rows.map((row) => (row.key === NO_LOCATION ? { ...row, name: words.noLocation } : row)) };
}

const twoSlots = (table: RegionTable) => table === "weaponAsh" || table === "shieldAsh" || table === "talisman";
