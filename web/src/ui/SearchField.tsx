import { useRef } from "react";

import { copy } from "../copy";
import { Icon } from "./Icon";
import "./SearchField.css";

/** A search box; `Clear search` shows once something is typed and returns focus to the box. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder = copy.controls.searchPlaceholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <label className="search-field">
      <Icon name="search" size={20} />
      <input
        ref={input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== "" && (
        <button
          type="button"
          className="search-field-clear"
          aria-label={copy.controls.clearSearch}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </label>
  );
}

/** A name with the letters a search matched at the text's own colour, so they stand out where the rest dims. */
export function SearchMatch({ name, match }: { readonly name: string; readonly match?: readonly [number, number] | undefined }) {
  if (match === undefined) return name;
  const [start, end] = match;
  return (
    <>
      {name.slice(0, start)}
      <span className="search-field-match">{name.slice(start, end)}</span>
      {name.slice(end)}
    </>
  );
}

/** What a search that found nothing says, under the field. */
export function SearchNone({ children }: { readonly children: string }) {
  return <p className="search-field-none">{children}</p>;
}
