import { copy } from "../copy";
import type { KitBlock } from "../kit/kit";
import { SearchField } from "./SearchField";
import { StickyHeader } from "./StickyHeader";

export const kit: readonly KitBlock[] = [
  {
    id: "sticky-header",
    title: "Sticky header",
    section: "simulation",
    size: "phone",
    states: [
      {
        label: "holding a search",
        render: () => (
          <StickyHeader>
            <SearchField label={copy.sim.searchLabel} placeholder={copy.sim.searchPlaceholder} value="" onChange={() => {}} />
          </StickyHeader>
        ),
      },
    ],
    note: "Hides while the page scrolls down and comes back on any scroll up; the UI kit's own header is one, dressed in mist.",
  },
];
