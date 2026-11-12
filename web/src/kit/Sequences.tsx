import { useState, type ReactNode } from "react";

import { Card } from "../views/Card";
import { Felled } from "../views/Felled";
import type { KitData } from "./kitData";

const noop = () => {};

/** A sequence in a phone-sized screen, remounted by its `Replay`, so it plays again at real speed. */
function Sequence({ id, title, children }: {
  readonly id: string;
  readonly title: string;
  readonly children: () => ReactNode;
}) {
  const [round, setRound] = useState(0);
  return (
    <figure id={id} className="kit-view kit-sequence">
      <figcaption className="kit-view-title">
        <a href={`#${id}`}>{title}</a>
        <button type="button" className="kit-replay" onClick={() => setRound(round + 1)}>
          Replay
        </button>
      </figcaption>
      <div key={round} className="kit-view-box">
        {children()}
      </div>
    </figure>
  );
}

/** The two staged sequences (web/src/ui/README.md#Sequences) on the real card at a fixed seed. */
export function Sequences({ kit }: { readonly kit: KitData }) {
  const { engine, runs } = kit;
  const card = (reveal: "full" | "none") => (
    <Card
      data={engine.data}
      run={runs.first}
      reveal={reveal}
      onReroll={noop}
      onDone={noop}
      onFelled={noop}
      onLevelUp={noop}
    />
  );
  return (
    <div className="kit-views">
      <Sequence id="sequence-objective" title="A new objective">
        {() => card("full")}
      </Sequence>
      <Sequence id="sequence-felled" title="An enemy felled">
        {() => (
          <Felled
            bossName={engine.data.bosses.get(runs.first.current.boss)?.name ?? "unknown boss"}
            label="Next objective in"
            behind={card("none")}
            onZero={noop}
            onUndo={noop}
          />
        )}
      </Sequence>
    </div>
  );
}
