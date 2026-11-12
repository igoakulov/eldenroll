import { useState } from "react";

import { HeadingAction, SectionHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { LozengeCheckbox } from "../ui/LozengeCheckbox";
import { SearchField } from "../ui/SearchField";
import { pickedEntries, searchGear, type FoundEntry, type GearEntry } from "./gearList";
import "./GearPicker.css";

function Name({ row }: { readonly row: FoundEntry }) {
  const { name } = row.entry;
  if (row.match === undefined) return name;
  const [start, end] = row.match;
  return (
    <>
      {name.slice(0, start)}
      <span className="gear-picker-match">{name.slice(start, end)}</span>
      {name.slice(end)}
    </>
  );
}

/** A search over `entries` and the picked ones under `N selected`, for `Never roll` and the `Weapon shortlist`. An
 * unticked entry keeps its place while this stays open. */
export function GearPicker({
  entries,
  picked,
  onChange,
  searchLabel,
  notFound,
}: {
  /** In card order. */
  readonly entries: readonly GearEntry[];
  readonly picked: readonly string[];
  readonly onChange: (picked: readonly string[]) => void;
  readonly searchLabel: string;
  readonly notFound: string;
}) {
  const [query, setQuery] = useState("");
  const [placed, setPlaced] = useState<ReadonlySet<string>>(() => new Set(picked));
  const searching = query.trim() !== "";
  const pickedSet = new Set(picked);

  const row = (found: FoundEntry) => {
    const { entry } = found;
    return (
      <LozengeCheckbox
        key={entry.key}
        checked={pickedSet.has(entry.key)}
        lead={
          entry.icon === null ? <span className="gear-picker-rule" /> : <Icon name={`${entry.icon}-22`} size={22} />
        }
        onChange={(checked) =>
          onChange(checked ? [...picked, entry.key] : picked.filter((key) => key !== entry.key))
        }
      >
        <Name row={found} />
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

      {searching && groups.length === 0 && <p className="gear-picker-none">{notFound}</p>}
      {groups.map((group) => (
        <section key={group.kind} className="gear-picker-results">
          <SectionHeading>{group.label}</SectionHeading>
          <div>{group.rows.map(row)}</div>
        </section>
      ))}

      {shown.length > 0 && (
        <section>
          <SectionHeading
            action={picked.length > 0 && <HeadingAction onClick={() => onChange([])}>Clear all</HeadingAction>}
          >
            <span className="gear-picker-count">{shown.filter((entry) => pickedSet.has(entry.key)).length}</span>{" "}
            selected
          </SectionHeading>
          <div>{shown.map((entry) => row({ entry }))}</div>
        </section>
      )}
    </>
  );
}
