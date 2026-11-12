import { Icon } from "./Icon";
import "./Tile.css";

const ICON_FILE = { lg: { suffix: "", size: 90 }, sm: { suffix: "-40", size: 38 } } as const;

/** An item's square tile with its subcategory icon. `empty` is the dark struck tile of a `none` slot. Wiki links
 * on tiles come with 7.5a. */
export function Tile({
  icon,
  size,
  empty = false,
}: {
  readonly icon: string | null;
  readonly size: "lg" | "sm";
  readonly empty?: boolean;
}) {
  const file = ICON_FILE[size];
  return (
    <span className={`tile tile-${size}${empty ? " tile-empty" : ""}`}>
      {icon !== null && <Icon name={`${icon}${file.suffix}`} size={file.size} />}
    </span>
  );
}
