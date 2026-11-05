import { useEffect, useState } from "react";

import type { Database } from "./engine/database";
import { loadDatabase } from "./loadDatabase";

type State =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly database: Database }
  | { readonly status: "failed" };

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    loadDatabase()
      .then((database) => setState({ status: "ready", database }))
      .catch(() => setState({ status: "failed" }));
  }, []);

  return (
    <main>
      <h1>EldenRando</h1>
      {state.status === "loading" && <p>Loading…</p>}
      {state.status === "failed" && <p>The game data could not be loaded.</p>}
      {state.status === "ready" && (
        <p>
          {state.database.item.length} items, {state.database.boss_instance.length} bosses
        </p>
      )}
    </main>
  );
}
