import { ACCEPTANCE, boosts, outOfPlace, synergies, type BoostRow, type Sample } from "../../sim/aggregate";
import { copy } from "../copy";
import { SectionHeading } from "../ui/Headings";
import { ListRow } from "../ui/Rows";
import { matches, modifierSentence, percent } from "./format";

const words = copy.simulate.boosts;

/** How many of what a guarantee lost to are named. */
const LOST_TO = 3;

export function Boosts({ sample, search }: { readonly sample: Sample; readonly search: string }) {
  const { guarantees, others } = boosts(sample);
  const shown = (row: BoostRow) => matches(modifierSentence(row.modifier), search);
  return (
    <>
      <BoostList title={words.guarantees} lede={words.guaranteesLede} rows={guarantees.filter(shown)} verdict />
      <BoostList title={words.others} lede={words.othersLede} rows={others.filter(shown)} verdict={false} />

      <section className="simulate-section">
        <SectionHeading>{words.synergies}</SectionHeading>
        <p className="simulate-lede">{words.synergiesLede}</p>
        {synergies(sample).map((chain) => (
          <div key={chain[0]!.modifier.id} className="simulate-rows simulate-chain">
            {chain.map((step) => (
              <ListRow
                key={step.modifier.id}
                title={modifierSentence(step.modifier)}
                value={words.landed(percent(step.triggered === 0 ? NaN : step.landed / step.triggered), step.triggered)}
              />
            ))}
          </div>
        ))}
      </section>

      <section className="simulate-section">
        <SectionHeading>{words.outOfPlace}</SectionHeading>
        <p className="simulate-lede">{words.outOfPlaceLede}</p>
        <div className="simulate-rows">
          {outOfPlace(sample)
            .filter((row) => matches(row.name, search))
            .map((row) => (
              <ListRow
                key={row.id}
                title={row.name}
                detail={words.outOfPlaceDetail[row.id]}
                value={words.won(percent(row.shown === 0 ? NaN : row.out / row.shown), row.shown)}
              />
            ))}
        </div>
      </section>
    </>
  );
}

function BoostList({
  title,
  lede,
  rows,
  verdict,
}: {
  readonly title: string;
  readonly lede: string;
  readonly rows: readonly BoostRow[];
  readonly verdict: boolean;
}) {
  return (
    <section className="simulate-section">
      <SectionHeading>{title}</SectionHeading>
      <p className="simulate-lede">{lede}</p>
      <div className="simulate-rows">
        {rows.length === 0 && <p className="simulate-lede">{copy.simulate.nothing}</p>}
        {rows.map((row) => {
          const share = row.won / row.active;
          const lost = row.lostTo
            .slice(0, LOST_TO)
            .map((one) => `${one.name === "" ? words.lostToEmpty : one.name} ${percent(one.count / row.active)}`)
            .join(", ");
          return (
            <ListRow
              key={row.modifier.id}
              title={modifierSentence(row.modifier)}
              {...(verdict && lost !== "" ? { detail: words.lostTo(lost) } : {})}
              value={(verdict && share < ACCEPTANCE ? words.failed : words.won)(percent(share), row.active)}
              {...(verdict ? { verdict: share >= ACCEPTANCE ? ("pass" as const) : ("fail" as const) } : {})}
            />
          );
        })}
      </div>
    </section>
  );
}
