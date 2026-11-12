import { SectionHeading, ScreenHead } from "../ui/Headings";
import { Screen } from "../ui/Screen";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import "./RoldCard.css";

const DISCLAIMER =
  "Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.";

/** The onboarding card `Elden Rold` opens from Start (`web/README.md#Elden Rold card`). */
export function RoldCard({ onClose }: { readonly onClose: () => void }) {
  return (
    <Screen>
      <TopBar eyebrow="How it works">
        <FramedIconButton icon="close" label="Close" onClick={onClose} />
      </TopBar>
      <ScreenHead
        title="Welcome to EldenRoll, Tarnished"
        lede="A companion to keep open while you play. Each objective rolls a boss to fell and the class and gear to fell it with, so every playthrough feels new again."
      >
        <p className="rold-pun">Follow fate to become Elden Rold.</p>
      </ScreenHead>

      <SectionHeading>A run</SectionHeading>
      <ol className="rold-steps">
        <li>
          <span>Set your stats and the regions you can reach, then start a run.</span>
        </li>
        <li>
          <span>Fell the rolled boss with only the rolled class, gear and combat rules.</span>
        </li>
        <li>
          <span>Not for you? <span className="rold-ui">Reroll</span> the whole objective, or only from one slot on, as often
          as you like.</span>
        </li>
        <li>
          <span>Tap <span className="rold-ui">Done</span>, level up, and roll the next objective.</span>
        </li>
        <li>
          <span>Felled that boss already? Tap <span className="rold-ui">Felled?</span> on its health bar for a new one.</span>
        </li>
      </ol>

      <SectionHeading>On your phone</SectionHeading>
      <p className="rold-body">
        Add EldenRoll to your Home Screen before your first run, and it opens full screen, like an app. On iPhone a run
        started in Safari stays in Safari.
      </p>
      <dl className="rold-how">
        <div>
          <dt>iPhone</dt>
          <dd>In Safari, tap Share, then Add to Home Screen.</dd>
        </div>
        <div>
          <dt>Android</dt>
          <dd>In Chrome, tap ⋮, then Add to Home screen.</dd>
        </div>
      </dl>

      <p className="rold-legal">{DISCLAIMER}</p>
    </Screen>
  );
}
