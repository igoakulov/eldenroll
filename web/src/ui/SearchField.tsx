import { useRef } from "react";

import { Icon } from "./Icon";
import "./SearchField.css";

/** A search box; `Clear search` shows once something is typed and returns focus to the box. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder = "Search by name",
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
          aria-label="Clear search"
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
