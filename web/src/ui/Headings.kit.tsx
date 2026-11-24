import { useState } from "react";

import { copy } from "../copy";
import type { KitBlock, KitProps } from "../kit/kit";
import { HeadingAction, HeadingCount, ScreenHead, Section, SectionHeading, SectionNote, SlotHeading } from "./Headings";
import { LozengeCheckbox } from "./LozengeCheckbox";

const noop = () => {};

function LiveSection({ kit }: KitProps) {
  const classes = kit.database.character_class;
  const [picked, setPicked] = useState(classes.map((row) => row.id).slice(0, 3));
  return (
    <>
      <SectionHeading action={picked.length > 0 && <HeadingAction onClick={() => setPicked([])}>{copy.runSettings.clearAll}</HeadingAction>}>
        <HeadingCount>{picked.length}</HeadingCount> {copy.runSettings.selected}
      </SectionHeading>
      {classes.slice(0, 3).map((row) => (
        <LozengeCheckbox
          key={row.id}
          checked={picked.includes(row.id)}
          onChange={(checked) => setPicked(checked ? [...picked, row.id] : picked.filter((id) => id !== row.id))}
        >
          {row.name}
        </LozengeCheckbox>
      ))}
    </>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "section-heading",
    title: "Section heading",
    section: "controls",
    size: "phone",
    states: [
      { label: "plain", render: () => <SectionHeading>{copy.common.regions}</SectionHeading> },
      {
        label: "a count and an action",
        render: () => (
          <SectionHeading action={<HeadingAction onClick={noop}>{copy.runSettings.clearAll}</HeadingAction>}>
            <HeadingCount>{3}</HeadingCount> {copy.runSettings.selected}
          </SectionHeading>
        ),
      },
    ],
    Live: LiveSection,
  },
  {
    id: "slot-heading",
    title: "Slot heading",
    section: "controls",
    size: "phone",
    states: [{ label: "plain", render: () => <SlotHeading>{copy.card.combatRule}</SlotHeading> }],
  },
  {
    id: "section-note",
    title: "Section and its note",
    section: "simulation",
    size: "phone",
    states: [
      {
        label: "a section: heading, note, body",
        render: () => (
          <Section title={copy.sim.slots.item} lede={copy.sim.counted("217.9")}>
            <SectionNote>{copy.sim.nothing}</SectionNote>
          </Section>
        ),
      },
    ],
  },
  {
    id: "screen-head",
    title: "Screen title",
    section: "controls",
    size: "phone",
    states: [
      { label: "with a lede", render: () => <ScreenHead title={copy.common.runSettings} lede={copy.common.changesApplyOnNextRoll} /> },
      { label: "over two lines", render: () => <ScreenHead title={copy.rold.title} /> },
    ],
  },
];
