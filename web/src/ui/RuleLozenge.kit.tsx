import type { KitBlock } from "../kit/kit";
import { RuleLozenge } from "./RuleLozenge";

export const kit: readonly KitBlock[] = [
  {
    id: "rule-lozenge",
    title: "Rule lozenge",
    section: "controls",
    size: "small",
    states: [{ label: "plain", render: () => <RuleLozenge /> }],
  },
];
