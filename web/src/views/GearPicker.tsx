import { useState } from "react";

import { copy } from "../copy";
import { HeadingAction, HeadingCount, SectionHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { SearchField, SearchMatch, SearchNone } from "../ui/SearchField";
import { pickedEntries, searchGear, type FoundEntry, type GearEntry } from "./gearList";
import "./GearPicker.css";

/** A search over `entries` and the picked ones under `N selected`, for `Never roll` and the `Weapon shortlist`. An
 * unticked entry keeps its place while this stays open. */
export function GearPicker({
  entries,
  picked,
  onChange,
  searchLabel,
  notFound,
  defaultQuery = "",
}: {
  /** In card order. */
  readonly entries: readonly GearEntry[];
  readonly picked: readonly string[];
  readonly onChange: (picked: readonly string[]) => void;
  readonly searchLabel: string;
  readonly notFound: string;
  /** What the search opens with, so the kit can show one; the app opens it empty. */
  readonly defaultQuery?: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [placed, setPlaced] = useState<ReadonlySet<string>>(() => new Set(picked));
  const searching = query.trim() !== "";
  const pickedSet = new Set(picked);

  const row = (found: FoundEntry, result: boolean) => {
    const { entry } = found;
    return (
      <LozengeCheckbox
        key={entry.key}
        checked={pickedSet.has(entry.key)}
        result={result}
        lead={
          entry.icon === null ? <span className="gear-picker-rule" /> : <Icon name={`${entry.icon}-22`} size={22} />
        }
        onChange={(checked) =>
          onChange(checked ? [...picked, entry.key] : picked.filter((key) => key !== entry.key))
        }
      >
        <SearchMatch name={entry.name} match={found.match} />
      </LozengeCheckbox>
    );
  };

  const groups = searching ? searchGear(entries, query) : [];
  const shown = searching ? [] : pickedEntries(entries, placed);

  return (
    <>
      <SearchField
        label={searchLabel}
        value={query}
        onChange={(next) => {
          setQuery(next);
          setPlaced(new Set([...placed, ...picked]));
        }}
      />

      {searching && groups.length === 0 && <SearchNone>{notFound}</SearchNone>}
      {groups.map((group) => (
        <section key={group.kind} className="gear-picker-results">
          <SectionHeading>{group.label}</SectionHeading>
          <div>{group.rows.map((found) => row(found, true))}</div>
        </section>
      ))}

      {shown.length > 0 && (
        <section>
          <SectionHeading
            action={picked.length > 0 && <HeadingAction onClick={() => onChange([])}>{copy.runSettings.clearAll}</HeadingAction>}
          >
            <HeadingCount>{shown.filter((entry) => pickedSet.has(entry.key)).length}</HeadingCount>{" "}
            {copy.runSettings.selected}
          </SectionHeading>
          <div>{shown.map((entry) => row({ entry }, false))}</div>
        </section>
      )}
    </>
  );
}
