import { copy } from "../copy";
import { Icon } from "./Icon";
import type { WikiLink } from "./WikiLink";
import "./Tile.css";

const ICON_FILE = { lg: { suffix: "", size: 90 }, sm: { suffix: "-40", size: 38 } } as const;

/** An item's square tile with its subcategory icon. `empty` is the dark struck tile of a `none` slot. With a
 * `link`, the tile opens the item's wiki page. */
export function Tile({
  icon,
  size,
  empty = false,
  link,
}: {
  readonly icon: string | null;
  readonly size: "lg" | "sm";
  readonly empty?: boolean;
  readonly link?: WikiLink | null;
}) {
  const file = ICON_FILE[size];
  const className = `tile tile-${size}${empty ? " tile-empty" : ""}`;
  const glyph = icon !== null && <Icon name={`${icon}${file.suffix}`} size={file.size} />;
  if (link === undefined || link === null) return <span className={className}>{glyph}</span>;
  return (
    <a className={`${className} tile-link`} href={link.url} target="_blank" rel="noopener" aria-label={copy.controls.onTheWiki(link.name)}>
      {glyph}
    </a>
  );
}
