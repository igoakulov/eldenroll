import { useState } from "react";

import type { KitBlock, KitProps } from "../kit/kit";
import { HeadingAction, HeadingCount, ScreenHead, SectionHeading, SlotHeading } from "./Headings";
import { LozengeCheckbox } from "./LozengeCheckbox";

const noop = () => {};

function LiveSection({ kit }: KitProps) {
  const classes = kit.database.character_class;
  const [picked, setPicked] = useState(classes.map((row) => row.id).slice(0, 3));
  return (
    <>
      <SectionHeading action={picked.length > 0 && <HeadingAction onClick={() => setPicked([])}>Clear all</HeadingAction>}>
        <HeadingCount>{picked.length}</HeadingCount> selected
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
      { label: "plain", render: () => <SectionHeading>Regions</SectionHeading> },
      {
        label: "a count and an action",
        render: () => (
          <SectionHeading action={<HeadingAction onClick={noop}>Clear all</HeadingAction>}>
            <HeadingCount>{3}</HeadingCount> selected
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
    states: [{ label: "plain", render: () => <SlotHeading>Combat rules</SlotHeading> }],
  },
  {
    id: "screen-head",
    title: "Screen title",
    section: "controls",
    size: "phone",
    states: [
      { label: "with a lede", render: () => <ScreenHead title="Run settings" lede="Changes apply on the next roll." /> },
      { label: "over two lines", render: () => <ScreenHead title="Welcome to EldenRoll, Tarnished" /> },
    ],
  },
];
