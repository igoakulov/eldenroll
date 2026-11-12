import type { KitBlock } from "../kit/kit";
import { Wordmark } from "./Wordmark";

const noop = () => {};

export const kit: readonly KitBlock[] = [
  {
    id: "wordmark",
    title: "Wordmark",
    section: "controls",
    size: "small",
    states: [
      { label: "title", render: () => <Wordmark /> },
      { label: "loading", render: () => <Wordmark loading /> },
      { label: "way home", render: () => <Wordmark onHome={noop} /> },
    ],
    Live: () => <Wordmark onHome={noop} />,
  },
];
