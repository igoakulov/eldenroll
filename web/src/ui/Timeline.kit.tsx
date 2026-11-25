import { useState } from "react";

import { copy } from "../copy";
import type { KitBlock, KitProps } from "../kit/kit";
import { iconKey } from "../views/icons";
import { DEFAULT_STATS, STATS } from "../engine/settings";
import { Timeline, TimelineEntry, TimelineRow, TimelineStats, TimelineValue } from "./Timeline";

const noop = () => {};

function Entries({ kit, open, hit = false }: KitProps & { readonly open: boolean; readonly hit?: boolean }) {
  const { samples } = kit;
  const card = copy.card;
  return (
    <Timeline>
      <TimelineEntry eyebrow={copy.runView.felledOnTheWay} names={[samples.boss.name, samples.boss.name]} />
      <TimelineEntry
        eyebrow={copy.common.objective(1)}
        names={[samples.boss.name]}
        line={samples.characterClass.name}
        open={open}
        onToggle={noop}
        {...(hit ? { hit: { label: card.rightHand, value: samples.weapon.name } } : {})}
      >
        <TimelineRow icon={iconKey(samples.weapon)} label={card.rightHand}>
          <TimelineValue matched={hit}>{samples.weapon.name}</TimelineValue>
          <TimelineValue kind="under">{samples.ash.name}</TimelineValue>
        </TimelineRow>
        <TimelineRow icon="medium_shield" label={card.leftHand}>
          <TimelineValue kind="none">{copy.controls.none}</TimelineValue>
        </TimelineRow>
        <TimelineRow icon="talisman" label={card.talismans}>
          <TimelineValue kind="any">{copy.controls.any}</TimelineValue>
        </TimelineRow>
        <TimelineRow rule label={card.combatRule}>
          <TimelineValue>{samples.rule.name}</TimelineValue>
        </TimelineRow>
        <TimelineRow label={copy.runView.atDone}>
          <TimelineValue>{copy.runView.levelAt(1)}</TimelineValue>
          <TimelineStats
            stats={STATS.map((stat) => ({ key: stat, label: copy.runView.statsShort[stat], value: DEFAULT_STATS[stat] }))}
          />
        </TimelineRow>
      </TimelineEntry>
    </Timeline>
  );
}

function LiveTimeline({ kit }: KitProps) {
  const [open, setOpen] = useState(false);
  const { samples } = kit;
  return (
    <Timeline>
      <TimelineEntry
        eyebrow={copy.common.objective(1)}
        names={[samples.boss.name]}
        line={samples.characterClass.name}
        open={open}
        onToggle={() => setOpen(!open)}
      >
        <TimelineRow icon={iconKey(samples.weapon)} label={copy.card.rightHand}>
          <TimelineValue>{samples.weapon.name}</TimelineValue>
        </TimelineRow>
      </TimelineEntry>
    </Timeline>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "timeline",
    title: "Timeline",
    section: "groups",
    size: "phone",
    states: [
      { label: "closed, felled on the way hollow", render: (kit) => <Entries kit={kit} open={false} /> },
      { label: "a search's match", render: (kit) => <Entries kit={kit} open={false} hit /> },
      { label: "open, none and any", render: (kit) => <Entries kit={kit} open /> },
      { label: "open, a search's match", render: (kit) => <Entries kit={kit} open hit /> },
    ],
    Live: LiveTimeline,
    note: "An objective's chevron turns as it opens; on desktop, hover lights its name.",
  },
];
