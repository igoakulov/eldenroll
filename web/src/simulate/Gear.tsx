import { gearShares, handShares, pairs, THIN_SAMPLE, type PairRow, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { DataTable, ShareBar } from "../ui/DataTable";
import { SectionHeading } from "../ui/Headings";
import { matches, percent } from "./format";
import { ShareSection } from "./ShareSection";

const words = copy.simulate.gear;
const columns = copy.simulate.columns;

export function Gear({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const both = pairs(sample);
  const pairRows = both.rows.filter((row) => matches(row.name, search));
  const scale = Math.max(0, ...both.rows.map((row) => row.share));
  const dualWieldOnly = sample.classes.length === 1 && sample.classes[0] === "warrior_dw";
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
      <ShareSection title={words.armor} table={gearShares(sample, "armor")} search={search} />
    </>
  );
}
