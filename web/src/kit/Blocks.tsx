import type { ReactNode } from "react";

import type { KitBlock } from "./kit";
import type { KitData } from "./kitData";

const entries = import.meta.glob<readonly KitBlock[]>("../ui/*.kit.tsx", { eager: true, import: "kit" });
// Only the names are read; eager, since the entries import these anyway, and a lazy glob would split them out
const components = import.meta.glob(["../ui/*.tsx", "!../ui/*.kit.tsx", "!../ui/*.test.tsx"], { eager: true });

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/(\.kit)?\.tsx$/, "");
}

const BLOCKS = Object.entries(entries)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, blocks]) => blocks);

const MISSING = Object.keys(components)
  .map(nameOf)
  .filter((name) => !Object.keys(entries).some((path) => nameOf(path) === name))
  .sort();

/** The components in `src/ui/` with no `<Name>.kit.tsx` beside them. */
export function MissingEntries() {
  if (MISSING.length === 0) return null;
  return (
    <p className="kit-missing" role="note">
      No kit entry yet: {MISSING.map((name) => `${name}.tsx`).join(", ")}.
    </p>
  );
}

function Cell({ label, live = false, size, children }: {
  readonly label: string;
  readonly live?: boolean;
  readonly size: KitBlock["size"];
  readonly children: ReactNode;
}) {
  return (
    <figure className={`kit-cell kit-cell-${size}${live ? " kit-cell-live" : ""}`}>
      <figcaption className="kit-cell-label">{label}</figcaption>
      <div className="kit-cell-box">{children}</div>
    </figure>
  );
}

export function Blocks({ kit, section }: { readonly kit: KitData; readonly section: KitBlock["section"] }) {
  return BLOCKS.filter((block) => block.section === section).map((block) => (
    <div key={block.id} id={block.id} className="kit-block">
      <h3 className="kit-block-title">
        <a href={`#${block.id}`}>{block.title}</a>
      </h3>
      <div className="kit-cells">
        {block.states.map((state) => (
          <Cell key={state.label} label={state.label} size={state.size ?? block.size}>
            {state.render(kit)}
          </Cell>
        ))}
        {block.Live !== undefined && (
          <Cell label="Live" live size={block.liveSize ?? block.size}>
            <block.Live kit={kit} />
          </Cell>
        )}
      </div>
      {block.note !== undefined && <p className="kit-note">{block.note}</p>}
    </div>
  ));
}
