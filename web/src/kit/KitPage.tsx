import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { Database } from "../engine/database";
import { loadDatabase } from "../loadDatabase";
import { VIEW_NAMES, VIEW_PARAM, type ViewName } from "./viewNames";
import { kitViews, type KitView } from "./views";
import "./KitPage.css";

// Placeholders until each is built (web/src/ui/README.md#UI kit)
const SECTIONS = [
  { id: "tokens", title: "Tokens" },
  { id: "controls", title: "Controls" },
  { id: "groups", title: "Groups" },
  { id: "sequences", title: "Sequences" },
] as const;

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed"; readonly message: string };

function isViewName(name: string | null): name is ViewName {
  return VIEW_NAMES.some((view) => view === name);
}

/** One view in a phone-sized screen; `data-kit-ready` tells the screenshot command it has rendered. */
function ViewBox({ name, view }: { readonly name: ViewName; readonly view: KitView }) {
  return (
    <div id={`view-${name}`} className="kit-view-box" data-kit-ready="">
      {view.render()}
    </div>
  );
}

function Views({ database, only }: { readonly database: Database; readonly only: ViewName | null }) {
  const views = useMemo(() => kitViews(database), [database]);

  // Each screen scrolls itself into view as it mounts, which leaves the page at the last one; after them, go back
  // to the anchor in the address, or the top
  useLayoutEffect(() => {
    if (only !== null) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const target = window.location.hash === "" ? null : document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [only]);

  if (only !== null) return <ViewBox name={only} view={views[only]} />;
  return (
    <div className="kit-views">
      {VIEW_NAMES.map((name) => (
        <figure key={name} className="kit-view">
          <figcaption className="kit-view-title">
            <a href={`#view-${name}`}>{views[name].title}</a>
          </figcaption>
          <ViewBox name={name} view={views[name]} />
        </figure>
      ))}
    </div>
  );
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

  const views =
    state.status === "ready" ? (
      <Views database={state.database} only={only} />
    ) : (
      <p className="kit-note" role="status">
        {state.status === "loading" ? "Loading db.json…" : `db.json could not be loaded: ${state.message}`}
      </p>
    );

  if (param !== null) {
    return only === null ? <p className="kit-note">No view named “{param}”.</p> : views;
  }

  return (
    <div className="kit-page">
      <h1 className="kit-title">EldenRoll UI kit</h1>
      <nav className="kit-contents" aria-label="Contents">
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
          <li>
            <a href="#views">Views</a>
          </li>
        </ul>
      </nav>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="kit-section">
          <h2 className="kit-section-title">{section.title}</h2>
          <p className="kit-note">Not built yet.</p>
        </section>
      ))}

      <section id="views" className="kit-section">
        <h2 className="kit-section-title">Views</h2>
        {views}
      </section>
    </div>
  );
}
