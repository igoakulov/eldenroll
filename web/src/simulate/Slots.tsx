import {
  className,
  empties,
  gearShares,
  handShares,
  pairs,
  ruleNone,
  THIN_SAMPLE,
  type EmptyRow,
  type PairRow,
  type Sample,
} from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { FOLD, matches, percent } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate.slots;
const columns = copy.simulate.columns;

export function Slots({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const both = pairs(sample);
  const pairRows = both.rows.filter((row) => matches(row.name, search));
  const scale = Math.max(0, ...both.rows.map((row) => row.share));
  const dualWieldOnly = sample.classes.length === 1 && sample.classes[0] === "warrior_dw";
  const none = ruleNone(sample);
  const empty = empties(sample);
  return (
    <>
      <ShareSection title={words.rh} lede={words.handLede} table={handShares(sample, "rh")} search={search} />
      <ShareSection title={words.lh} lede={words.handLede} table={handShares(sample, "lh")} search={search} />

      {(search === "" || pairRows.length > 0) && (
        <section className="simulate-section">
          <SectionHeading>{words.pairs}</SectionHeading>
          <p className="simulate-lede">
            {`${words.pairsLede} ${copy.simulate.counted(both.total)}`}
            {both.sameClass.of > 0 && (
              <>
                <br />
                {words.sameClass(percent(both.sameClass.count / both.sameClass.of), both.sameClass.of)}
                {dualWieldOnly && ` ${words.dualWieldAim}`}
              </>
            )}
          </p>
          <DataTable<PairRow>
            label={words.pairs}
            columns={[
              { id: "rh", label: words.rhColumn, sortValue: (row) => row.rh, render: (row) => row.rh },
              { id: "lh", label: words.lhColumn, sortValue: (row) => row.lh, render: (row) => row.lh },
              { id: "count", label: columns.objectives, numeric: true, sortValue: (row) => row.count, render: (row) => row.count },
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

      <ShareSection title={words.spell} table={gearShares(sample, "spell")} search={search} />
      <ShareSection title={words.weaponAsh} table={gearShares(sample, "weaponAsh")} search={search} />
      <ShareSection title={words.shieldAsh} table={gearShares(sample, "shieldAsh")} search={search} />
      <ShareSection title={words.item} table={gearShares(sample, "item")} search={search} />
      <ShareSection title={words.talisman} lede={words.talismanLede} table={gearShares(sample, "talisman")} search={search} />
      <ShareSection title={words.rule} lede={words.ruleLede} table={gearShares(sample, "rule")} search={search} />
      <section className="simulate-section">
        <SectionHeading>{words.ruleNone}</SectionHeading>
        <p className="simulate-lede">{`${words.ruleNoneNote} ${copy.simulate.counted(none.total)}`}</p>
        <div className="simulate-rows">
          <ListRow title={words.neither} value={percent(none.total === 0 ? NaN : none.neither / none.total)} />
          <ListRow title={words.one} value={percent(none.total === 0 ? NaN : none.one / none.total)} />
        </div>
      </section>

      <ShareSection title={words.armor} table={gearShares(sample, "armor")} search={search} />

      <section className="simulate-section">
        <SectionHeading>{words.empties}</SectionHeading>
        <p className="simulate-lede">{words.emptiesLede}</p>
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
            { id: "count", label: columns.rolls, numeric: true, sortValue: (row) => row.count, render: (row) => row.count },
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
          initialSort="count"
          empty={words.noEmpties}
        />
      </section>
    </>
  );
}
