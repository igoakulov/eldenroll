import { copy } from "../copy";
import { SectionHeading, ScreenHead } from "../ui/Headings";
import { Screen } from "../ui/Screen";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { Wordmark } from "../ui/Wordmark";
import "./HowItWorks.css";

/** A step's text with each `[word]` set apart as the app's own control. */
function Step({ text }: { readonly text: string }) {
  // Splitting on a capturing group puts each bracketed word at an odd index
  const parts = text.split(/\[([^\]]+)\]/);
  return (
    <span>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="how-it-works-ui">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/** How it works: the onboarding page, opened from `Elden Rold` in Start's tagline and from the menu
 * (`web/README.md#How it works`). */
export function HowItWorks({ onClose, onHome }: { readonly onClose: () => void; readonly onHome: () => void }) {
  const text = copy.howItWorks;
  return (
    <Screen>
      <TopBar eyebrow={copy.common.howItWorks}>
        <FramedIconButton icon="close" label={copy.common.close} onClick={onClose} />
      </TopBar>
      <header className="how-it-works-home">
        <Wordmark onHome={onHome} />
      </header>
      <ScreenHead title={text.title} lede={text.lede}>
        <p className="how-it-works-pun">{text.pun}</p>
      </ScreenHead>

      <SectionHeading>{text.aRun}</SectionHeading>
      <ol className="how-it-works-steps">
        {text.steps.map((step) => (
          <li key={step}>
            <Step text={step} />
          </li>
        ))}
      </ol>

      <SectionHeading>{text.onYourPhone}</SectionHeading>
      <p className="how-it-works-body">{text.homeScreen}</p>
      <dl className="how-it-works-how">
        {text.howTo.map((row) => (
          <div key={row.device}>
            <dt>{row.device}</dt>
            <dd>{row.how}</dd>
          </div>
        ))}
      </dl>

      <p className="how-it-works-legal">{text.disclaimer}</p>
    </Screen>
  );
}
