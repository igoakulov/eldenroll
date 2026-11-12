import type { KitBlock } from "../kit/kit";
import { WikiText } from "./WikiLink";

export const kit: readonly KitBlock[] = [
  {
    id: "wiki-text",
    title: "Wiki link",
    section: "controls",
    size: "phone",
    states: [
      {
        label: "linked",
        render: ({ samples }) => (
          <p className="kit-name">
            <WikiText url={samples.boss.url} className="kit-wiki">
              {samples.boss.name}
            </WikiText>
          </p>
        ),
      },
      {
        label: "no page",
        render: ({ samples }) => (
          <p className="kit-name">
            <WikiText url={null} className="kit-wiki">
              {samples.boss.name}
            </WikiText>
          </p>
        ),
      },
    ],
    Live: ({ kit }) => (
      <p className="kit-name">
        <WikiText url={kit.samples.boss.url} className="kit-wiki">
          {kit.samples.boss.name}
        </WikiText>
      </p>
    ),
    note: "A link opens the wiki in a new tab; its tap target reaches past the text.",
  },
];
