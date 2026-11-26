import { useRef, useState } from "react";

import { isOwner, setOwner } from "../analytics";
import { copy } from "../copy";
import { SectionHeading, ScreenHead } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { Screen } from "../ui/Screen";
import { WikiText } from "../ui/WikiLink";
import { FramedIconButton, TopBar } from "../ui/TopBar";
import { Wordmark } from "../ui/Wordmark";
import "./HowItWorks.css";

const LINKS = {
  github: "https://github.com/igoakulov/eldenroll",
  x: "https://x.com/igoakulov",
  sim: "/sim/",
  kit: "/kit/",
} as const;

/** A line with each `[word]` set apart as the app's own control, and each `{name}` replaced by its icon, sized to the
 * text: Safari's buttons, or the app's own icon as the Home Screen shows it. An icon stays on the line of the word
 * before it. */
function Rich({ text }: { readonly text: string }) {
  // Splitting on capturing groups puts each match at an odd index, its bracket kept to tell the two apart
  const parts = text.split(/(\[[^\]]+\]|\{\w+\})/);
  return parts.map((part, index) => {
    const next = parts[index + 1];
    const glued = next?.startsWith("{") === true ? /\S+\s*$/.exec(part) : null;
    if (index % 2 === 0) return glued === null ? part : part.slice(0, glued.index);
    const inner = part.slice(1, -1);
    if (part.startsWith("["))
      return (
        <span key={index} className="how-it-works-ui">
          {inner}
        </span>
      );
    const before = /\S+\s*$/.exec(parts[index - 1] ?? "")?.[0] ?? "";
    return (
      <span key={index} className="how-it-works-glued">
        {before}
        {inner === "app" ? (
          <img className="how-it-works-app-icon" src="/icons/apple-touch-icon.png" alt="" />
        ) : (
          <span className="how-it-works-icon">
            <Icon name={inner} size={18} />
          </span>
        )}
      </span>
    );
  });
}

/** Terms beside what they mean, the terms in one column as wide as the longest. */
function Terms({ rows }: { readonly rows: readonly { readonly term: string; readonly text: string; readonly note?: string }[] }) {
  return (
    <dl className="how-it-works-terms">
      {rows.map((row) => (
        <div key={row.term}>
          <dt>{row.term}</dt>
          <dd>
            <Rich text={row.text} />
            {row.note !== undefined && <span className="how-it-works-note">{row.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** How it works: the onboarding page, opened from `Elden Rold` in Start's tagline and from the menu
 * (`web/README.md#How it works`). */
/** Five taps, each within a second of the last, toggle the owner mark on this install; a slower tap starts again. */
const OWNER_TAPS = 5;
const OWNER_TAP_MS = 1000;

export function HowItWorks({ onClose, onHome }: { readonly onClose: () => void; readonly onHome: () => void }) {
  const text = copy.howItWorks;
  const [owner, setOwnerShown] = useState(isOwner);
  const taps = useRef({ count: 0, at: 0 });
  const tapPrivacy = () => {
    const now = Date.now();
    const count = now - taps.current.at <= OWNER_TAP_MS ? taps.current.count + 1 : 1;
    taps.current = { count: count === OWNER_TAPS ? 0 : count, at: now };
    if (count < OWNER_TAPS) return;
    setOwner(!owner);
    setOwnerShown(!owner);
  };
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
      <p className="how-it-works-intro">
        <Rich text={text.runIntro} />
      </p>
      <ol className="how-it-works-steps">
        {text.run.map((step) => (
          <li key={step}>
            <span>
              <Rich text={step} />
            </span>
          </li>
        ))}
      </ol>

      <SectionHeading>{text.anObjective}</SectionHeading>
      <p className="how-it-works-intro">{text.objectiveIntro}</p>
      <Terms rows={text.objective} />

      <SectionHeading>{text.runSettings}</SectionHeading>
      <p className="how-it-works-intro">{text.settingsIntro}</p>
      <Terms rows={text.settings} />

      <SectionHeading>{text.onYourPhone}</SectionHeading>
      <p className="how-it-works-intro">
        <Rich text={text.homeScreen} />
      </p>
      <Terms
        rows={text.howTo.map((row, index) => ({
          term: row.device,
          text: row.how,
          ...(index === 0 ? { note: text.beforeFirstRun } : {}),
        }))}
      />

      <nav className="how-it-works-links">
        <a className="how-it-works-mark" href={LINKS.x} target="_blank" rel="noopener" aria-label={text.links.x}>
          <Icon name="x" size={18} />
        </a>
        <a className="how-it-works-mark" href={LINKS.github} target="_blank" rel="noopener" aria-label={text.links.github}>
          <Icon name="github" size={18} />
        </a>
        <WikiText url={LINKS.sim} className="how-it-works-link">
          {text.links.sim}
        </WikiText>
        <WikiText url={LINKS.kit} className="how-it-works-link">
          {text.links.kit}
        </WikiText>
      </nav>

      <p className="how-it-works-legal" onClick={tapPrivacy}>
        {owner ? text.privacyOwner : text.privacy}
      </p>
      <p className="how-it-works-legal">{text.disclaimer}</p>
    </Screen>
  );
}
