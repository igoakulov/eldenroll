import {
  className,
  empties,
  gearShares,
  handShares,
  pairs,
  ruleNone,
  THIN_SAMPLE,
  type EmptyRow,
  type HandView,
  type PairRow,
  type Sample,
} from "../../sim/aggregate";
import { copy } from "../copy";
import { Cycler } from "../ui/Cycler";
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { FOLD, matches, percent, perRun } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate.slots;
const columns = copy.simulate.columns;

export function Slots({
  sample,
  search,
  hands,
  onHands,
}: {
  readonly sample: Sample;
  readonly search: string;
  readonly hands: HandView;
  readonly onHands: (hands: HandView) => void;
}) {
  const both = pairs(sample);
  const pairRows = both.rows.filter((row) => matches(row.name, search));
  const scale = Math.max(0, ...both.rows.map((row) => row.share));
  const dualWieldOnly = sample.classes.length === 1 && sample.classes[0] === "warrior_dw";
  const none = ruleNone(sample);
  const empty = empties(sample);
  const runs = sample.results.length;
  return (
    <>
      {(["rh", "lh"] as const).map((slot) => (
        <ShareSection
          key={slot}
          title={words[slot]}
          lede={words.handLede[hands]}
          // One switch for both hands, so they always read the same way
          control={
            <div className="simulate-switch">
              <Cycler<HandView>
                label={words.countBy}
                options={[
                  { value: "class", label: words.byClass },
                  { value: "weapon", label: words.byWeapon },
                ]}
                value={hands}
                onChange={onHands}
              />
            </div>
          }
          table={handShares(sample, slot, hands)}
          search={search}
        />
      ))}

      {(search === "" || pairRows.length > 0) && (
        <section className="simulate-section">
          <SectionHeading>{words.pairs}</SectionHeading>
          <p className="simulate-lede">
            {`${words.pairsLede} ${copy.simulate.counted(perRun(both.total / runs))}`}
            {both.sameClass.of > 0 && (
              <>
                <br />
                {words.sameClass(percent(both.sameClass.count / both.sameClass.of), perRun(both.sameClass.of / runs))}
                {dualWieldOnly && ` ${words.dualWieldAim}`}
              </>
            )}
          </p>
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

      <ShareSection title={words.spell} table={gearShares(sample, "spell")} search={search} />
      <ShareSection title={words.weaponAsh} table={gearShares(sample, "weaponAsh")} search={search} />
      <ShareSection title={words.shieldAsh} table={gearShares(sample, "shieldAsh")} search={search} />
      <ShareSection title={words.item} table={gearShares(sample, "item")} search={search} />
      <ShareSection title={words.talisman} lede={words.talismanLede} table={gearShares(sample, "talisman")} search={search} />
      <ShareSection title={words.rule} lede={words.ruleLede} table={gearShares(sample, "rule")} search={search} />
      <section className="simulate-section">
        <SectionHeading>{words.ruleNone}</SectionHeading>
        <p className="simulate-lede">{`${words.ruleNoneNote} ${copy.simulate.counted(perRun(none.total / runs))}`}</p>
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
