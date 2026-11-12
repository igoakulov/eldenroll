import { ARMOR_PIECES, type SlotDisplay } from "../engine/display";
import { ArmorSlot, HandSlot, SmallSlot, type SlotName, type SlotTile } from "../ui/Slot";
import type { WikiLink } from "../ui/WikiLink";
import { ARMOR_PIECE_ICONS, iconKey } from "./icons";

// The card's slots as the engine rolls them, drawn with the slot components in `src/ui/`

/** The id the `none` item, the `None` armor pieces' alias and the rule `None` share. */
const NONE_ALIAS = "none";

/** What a slot shows as its name: the item, `none` or `any`. */
export function nameOf(display: SlotDisplay): SlotName {
  switch (display.kind) {
    case "none":
    case "any":
      return { kind: display.kind };
    case "item":
      return { kind: "named", name: display.item.name };
    case "alias":
      return { kind: "named", name: display.label };
    case "rule":
      return display.rule.id === NONE_ALIAS ? { kind: "none" } : { kind: "named", name: display.rule.name };
    case "armor_set":
      return { kind: "named", name: display.set.name };
  }
}

/** An item, set or alias has a page; `none` and `any` have none. */
function linkOf(display: SlotDisplay): WikiLink | null {
  if (display.kind === "alias" && display.url !== null) return { name: display.label, url: display.url };
  if (display.kind === "item" && display.item.url !== null) return { name: display.item.name, url: display.item.url };
  if (display.kind === "armor_set" && display.set.url !== null) return { name: display.set.name, url: display.set.url };
  return null;
}

/** An empty slot's tile shows `emptyIcon`, what the slot usually holds. */
function tileOf(display: SlotDisplay, emptyIcon: string): SlotTile {
  if (display.kind === "none") return { icon: emptyIcon, link: null };
  const icon = display.kind === "item" || display.kind === "alias" ? iconKey(display.item) : null;
  return { icon, link: linkOf(display) };
}

export function Hand({ label, hand, ash, emptyIcon }: {
  readonly label: string;
  readonly hand: SlotDisplay;
  readonly ash: SlotDisplay;
  readonly emptyIcon: string;
}) {
  const named = ash.kind === "item" || ash.kind === "alias";
  const ashName = nameOf(ash);
  return (
    <HandSlot
      label={label}
      name={nameOf(hand)}
      tile={tileOf(hand, emptyIcon)}
      ash={named && ashName.kind === "named" ? { name: ashName.name, url: linkOf(ash)?.url ?? null } : null}
    />
  );
}

export function Small({ display, emptyIcon }: { readonly display: SlotDisplay; readonly emptyIcon: string }) {
  return <SmallSlot name={nameOf(display)} tile={tileOf(display, emptyIcon)} />;
}

export function Armor({ display }: { readonly display: SlotDisplay }) {
  if (display.kind !== "armor_set") return <Small display={display} emptyIcon={ARMOR_PIECE_ICONS.body} />;
  return (
    <ArmorSlot
      name={display.set.name}
      url={display.set.url}
      pieces={ARMOR_PIECES.map((piece) => {
        // A `None` piece keeps the slot empty, unlike `any` (web/src/engine/README.md#Empty slots and aliases)
        const rolled = display.pieces[piece];
        const shown: SlotDisplay = rolled.kind === "alias" && rolled.item.alias === NONE_ALIAS ? { kind: "none" } : rolled;
        return {
          key: piece,
          name: nameOf(shown),
          tile: { icon: ARMOR_PIECE_ICONS[piece], link: linkOf(shown) },
        };
      })}
    />
  );
}
