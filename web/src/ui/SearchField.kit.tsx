import { useState } from "react";

import type { KitBlock, KitProps } from "../kit/kit";
import { findMatch } from "../views/search";
import { SearchField, SearchMatch, SearchNone } from "./SearchField";

const noop = () => {};
// A real search, matching inside names as well as at their start
const QUERY = "dragon";
const SHOWN = 5;

/** Boss names matching `query`, the rest dimmed as in `Bosses`. */
function Found({ kit, query }: KitProps & { readonly query: string }) {
  const found = kit.database.boss_instance
    .filter((boss) => boss.odds > 0)
    .map((boss) => ({ name: boss.name, match: findMatch(boss.name, query) }))
    .filter((row) => row.match !== null)
    .slice(0, SHOWN);
  if (found.length === 0) return <SearchNone>No boss by that name.</SearchNone>;
  return (
    <ul className="kit-found">
      {found.map((row) => (
        <li key={row.name}>
          <SearchMatch name={row.name} match={row.match ?? undefined} />
        </li>
      ))}
    </ul>
  );
}

function LiveSearch({ kit }: KitProps) {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchField label="Search bosses" value={query} onChange={setQuery} />
      {query.trim() !== "" && <Found kit={kit} query={query} />}
    </>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "search-field",
    title: "Search field",
    section: "groups",
    size: "phone",
    states: [
      { label: "empty", render: () => <SearchField label="Search bosses" value="" onChange={noop} /> },
      {
        label: "searching",
        render: (kit) => (
          <>
            <SearchField label="Search bosses" value={QUERY} onChange={noop} />
            <Found kit={kit} query={QUERY} />
          </>
        ),
      },
      {
        label: "nothing found",
        render: () => (
          <>
            <SearchField label="Search bosses" value="Tarnished" onChange={noop} />
            <SearchNone>No boss by that name.</SearchNone>
          </>
        ),
      },
    ],
    Live: LiveSearch,
  },
];
