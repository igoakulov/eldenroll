import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Database } from "../engine/database";
import { loadDatabase } from "../loadDatabase";
import { WordmarkO } from "../ui/Icon";
import { StickyHeader } from "../ui/StickyHeader";
import { Blocks, MissingEntries } from "./Blocks";
import { KitFrame } from "./kit";
import { kitData, type KitData } from "./kitData";
import { Sequences } from "./Sequences";
import { Tokens } from "./Tokens";
import { VIEW_NAMES, VIEW_PARAM, type ViewName } from "./viewNames";
import { kitViews, type KitView } from "./views";
import "./KitPage.css";

const SECTIONS = [
  { id: "tokens", title: "Tokens" },
  { id: "controls", title: "Controls" },
  { id: "groups", title: "Groups" },
  { id: "sequences", title: "Sequences" },
  { id: "views", title: "Views" },
  { id: "simulation", title: "Sim" },
] as const;

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed"; readonly message: string };

function isViewName(name: string | null): name is ViewName {
  return VIEW_NAMES.some((view) => view === name);
}

/** One view in a phone-sized screen, scrolled to its `scrollTo`. Alone on the page, it carries the id and
 * `data-kit-ready` the screenshot command waits for. */
function ViewBox({ name, view, alone = false }: {
  readonly name: ViewName;
  readonly view: KitView;
  readonly alone?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  // After the screen scrolls itself to its top as it mounts; the box alone moves, never the page
  useLayoutEffect(() => {
    const element = box.current;
    const target = view.scrollTo === undefined ? null : element?.querySelector(view.scrollTo);
    if (element === null || target === null || target === undefined) return;
    element.scrollTop += target.getBoundingClientRect().top - element.getBoundingClientRect().top;
  }, [view]);
  return (
    <div ref={box} className="kit-view-box" {...(alone ? { id: `view-${name}`, "data-kit-ready": "" } : {})}>
      {view.render()}
    </div>
  );
}

function Views({ views, sheets }: { readonly views: Readonly<Record<ViewName, KitView>>; readonly sheets: boolean }) {
  return (
    <div className="kit-views">
      {VIEW_NAMES.filter((name) => (views[name].sheet ?? false) === sheets).map((name) => (
        <figure key={name} id={`view-${name}`} className="kit-view">
          <figcaption className="kit-view-title">
            <a href={`#view-${name}`}>{views[name].title}</a>
          </figcaption>
          {/* A sheet holds the keyboard, so each sits in a page of its own (`KitFrame`) */}
          {sheets ? (
            <KitFrame view={name} title={views[name].title} />
          ) : (
            <ViewBox name={name} view={views[name]} />
          )}
        </figure>
      ))}
    </div>
  );
}

function Sections({ kit }: { readonly kit: KitData }) {
  const views = useMemo(() => kitViews(kit), [kit]);

  // Each screen scrolls itself into view as it mounts, which leaves the page at the last one; after them, go back
  // to the anchor in the address, or the top
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const target = window.location.hash === "" ? null : document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  return (
    <>
      <section id="tokens" className="kit-section">
        <h2 className="kit-section-title">Tokens</h2>
        <Tokens kit={kit} />
      </section>
      <section id="controls" className="kit-section">
        <h2 className="kit-section-title">Controls</h2>
        <Blocks kit={kit} section="controls" />
      </section>
      <section id="groups" className="kit-section">
        <h2 className="kit-section-title">Groups</h2>
        <Blocks kit={kit} section="groups" />
        <div id="sheets" className="kit-block">
          <h3 className="kit-block-title">
            <a href="#sheets">Sheets over their screens</a>
          </h3>
          <Views views={views} sheets />
        </div>
      </section>
      <section id="sequences" className="kit-section">
        <h2 className="kit-section-title">Sequences</h2>
        <Sequences kit={kit} />
      </section>
      <section id="views" className="kit-section">
        <h2 className="kit-section-title">Views</h2>
        <Views views={views} sheets={false} />
      </section>
      <section id="simulation" className="kit-section">
        <h2 className="kit-section-title">Sim</h2>
        <p className="kit-note">
          Only the simulation page at <a href="/sim/">/sim/</a> uses these; the app never shows them.
        </p>
        <Blocks kit={kit} section="simulation" />
      </section>
    </>
  );
}

function Single({ database, name }: { readonly database: Database; readonly name: ViewName }) {
  const views = useMemo(() => kitViews(kitData(database)), [database]);
  return <ViewBox name={name} view={views[name]} alone />;
}

function Page({ database }: { readonly database: Database }) {
  const kit = useMemo(() => kitData(database), [database]);
  return <Sections kit={kit} />;
}

export function KitPage() {
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const param = new URLSearchParams(window.location.search).get(VIEW_PARAM);
  const only = isViewName(param) ? param : null;

  useEffect(() => {
    let current = true;
    loadDatabase()
      .then((database) => {
        if (current) setState({ status: "ready", database });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (current) setState({ status: "failed", message: String(error) });
      });
    return () => {
      current = false;
    };
  }, []);

  const waiting =
    state.status === "ready" ? null : (
      <p className="kit-note" role="status">
        {state.status === "loading" ? "Loading db.json…" : `db.json could not be loaded: ${state.message}`}
      </p>
    );

  if (param !== null) {
    if (only === null) return <p className="kit-note">No view named “{param}”.</p>;
    return state.status === "ready" ? <Single database={state.database} name={only} /> : waiting;
  }

  return (
    <div className="kit-page">
      <StickyHeader className="kit-header">
        <h1 className="kit-title" aria-label="Elden Roll UI kit">
          <span className="kit-wordmark" aria-hidden="true">
            ELDENR
            <WordmarkO className="kit-wordmark-o" />
            LL
          </span>
          <span className="kit-subtitle" aria-hidden="true">UI kit</span>
        </h1>
        <nav className="kit-contents" aria-label="Contents">
          <ul>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a className="wiki-text" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </StickyHeader>
      <MissingEntries />
      {state.status === "ready" ? <Page database={state.database} /> : waiting}
    </div>
  );
}

