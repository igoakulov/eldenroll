import { KitScreen, type KitBlock } from "../kit/kit";
import { ScreenHead } from "./Headings";
import { Screen } from "./Screen";

export const kit: readonly KitBlock[] = [
  {
    id: "screen",
    title: "Screen",
    section: "groups",
    size: "phone",
    states: [
      {
        label: "mist at the centre, on Start",
        render: () => (
          <KitScreen short>
            <Screen mist="centre">{null}</Screen>
          </KitScreen>
        ),
      },
      {
        label: "mist at the left",
        render: () => (
          <KitScreen short>
            <Screen>
              <ScreenHead title="Bosses" />
            </Screen>
          </KitScreen>
        ),
      },
    ],
  },
];
