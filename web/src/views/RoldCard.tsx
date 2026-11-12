import { copy } from "../copy";
import { SectionHeading, ScreenHead } from "../ui/Headings";
import { Screen } from "../ui/Screen";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { Wordmark } from "../ui/Wordmark";
import "./RoldCard.css";

/** A step's text with each `[word]` set apart as the app's own control. */
function Step({ text }: { readonly text: string }) {
  // Splitting on a capturing group puts each bracketed word at an odd index
  const parts = text.split(/\[([^\]]+)\]/);
  return (
    <span>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="rold-ui">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/** The onboarding card `Elden Rold` opens from Start (`web/README.md#Elden Rold card`). */
export function RoldCard({ onClose, onHome }: { readonly onClose: () => void; readonly onHome: () => void }) {
  const text = copy.rold;
  return (
    <Screen>
      <TopBar eyebrow={copy.common.howItWorks}>
        <FramedIconButton icon="close" label={copy.common.close} onClick={onClose} />
      </TopBar>
      <header className="rold-home">
        <Wordmark onHome={onHome} />
      </header>
      <ScreenHead title={text.title} lede={text.lede}>
        <p className="rold-pun">{text.pun}</p>
      </ScreenHead>

      <SectionHeading>{text.aRun}</SectionHeading>
      <ol className="rold-steps">
        {text.steps.map((step) => (
          <li key={step}>
            <Step text={step} />
          </li>
        ))}
      </ol>

      <SectionHeading>{text.onYourPhone}</SectionHeading>
      <p className="rold-body">{text.homeScreen}</p>
      <dl className="rold-how">
        {text.howTo.map((row) => (
          <div key={row.device}>
            <dt>{row.device}</dt>
            <dd>{row.how}</dd>
          </div>
        ))}
      </dl>

      <p className="rold-legal">{text.disclaimer}</p>
    </Screen>
  );
}
