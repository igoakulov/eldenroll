import { Tile } from "./Tile";
import { WikiText, type WikiLink } from "./WikiLink";
import "./Slot.css";

/** What a slot names: an item, set or rule; `none`, an empty slot; or `any`, which leaves the pick to the player. */
export type SlotName = { readonly kind: "named"; readonly name: string } | { readonly kind: "none" } | { readonly kind: "any" };

/** A slot's tile: its icon (an empty slot's shows what the slot usually holds) and its wiki page, if any. */
export interface SlotTile {
  readonly icon: string | null;
  readonly link: WikiLink | null;
}

/** The name, `none` in dim small caps, or `any` in gold italics. */
function Name({ name, className }: { readonly name: SlotName; readonly className: string }) {
  if (name.kind === "none") return <span className={`${className} slot-none`}>none</span>;
  if (name.kind === "any") return <span className={`${className} slot-any`}>any</span>;
  return <span className={className}>{name.name}</span>;
}

/** A weapon hand: a large tile, the hand, the weapon and its ash of war, which links to its own page. */
export function HandSlot({
  label,
  name,
  tile,
  ash,
}: {
  readonly label: string;
  readonly name: SlotName;
  readonly tile: SlotTile;
  readonly ash: { readonly name: string; readonly url: string | null } | null;
}) {
  return (
    <div className="slot-hand">
      <Tile size="lg" icon={tile.icon} empty={name.kind === "none"} link={tile.link} />
      <span className="slot-hand-label">{label}</span>
      <Name name={name} className="slot-name" />
      {ash !== null && (
        <WikiText url={ash.url} className="slot-ash">
          {ash.name}
        </WikiText>
      )}
    </div>
  );
}

/** A small tile beside its name: a spell, a talisman, an item. */
export function SmallSlot({ name, tile }: { readonly name: SlotName; readonly tile: SlotTile }) {
  return (
    <div className="slot-small">
      <Tile size="sm" icon={tile.icon} empty={name.kind === "none"} link={tile.link} />
      <Name name={name} className="slot-name" />
    </div>
  );
}

/** An armor set's name over its four pieces, each its own small tile. */
export function ArmorSlot({
  name,
  url,
  pieces,
}: {
  readonly name: string;
  readonly url: string | null;
  readonly pieces: readonly { readonly key: string; readonly name: SlotName; readonly tile: SlotTile }[];
}) {
  return (
    <div className="slot-armor">
      <WikiText url={url} className="slot-name">
        {name}
      </WikiText>
      <div className="slot-armor-pieces">
        {pieces.map((piece) => (
          <div className="slot-armor-piece" key={piece.key}>
            <Tile size="sm" icon={piece.tile.icon} empty={piece.name.kind === "none"} link={piece.tile.link} />
            <Name name={piece.name} className="slot-armor-piece-name" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A combat rule behind its red lozenge, or `none`. */
export function RuleSlot({ name }: { readonly name: SlotName }) {
  if (name.kind !== "named") {
    return (
      <p className="slot-rule">
        <Name name={name} className="slot-rule-name" />
      </p>
    );
  }
  return (
    <p className="slot-rule">
      <span className="slot-rule-lozenge" aria-hidden="true" />
      {name.name}
    </p>
  );
}
