import { displaySlots, type RolledSlots } from "../engine/display";
import type { KitBlock } from "../kit/kit";
import type { KitData } from "../kit/kitData";
import { EMPTY_SLOT_ICONS } from "../views/icons";
import { Armor, Hand, Small, nameOf } from "../views/slots";
import { RuleSlot } from "./Slot";

/** What the card shows for these rolled ids, through the engine as the card gets it. */
function shown(kit: KitData, slots: RolledSlots) {
  return displaySlots(kit.engine.data, slots);
}

/** The first rollable armor set with a piece that reads `kind`: `none` for a `None` piece, `any` for a missing one. */
function setShowing(kit: KitData, kind: "none" | "any") {
  return kit.database.armor_set
    .filter((set) => set.odds > 0)
    .map((set) => shown(kit, { armor: set.id }).armor)
    .find(
      (display) =>
        display.kind === "armor_set" &&
        Object.values(display.pieces).some((piece) =>
          kind === "any" ? piece.kind === "any" : piece.kind === "alias" && piece.item.alias === "none",
        ),
    );
}

function Hands({ kit }: { readonly kit: KitData }) {
  const slots = shown(kit, { lh: null, rh: kit.samples.weapon.id, rh_ash: kit.samples.ash.id });
  return (
    <div className="kit-hands">
      <Hand label="Left hand" hand={slots.lh} ash={slots.lh_ash} emptyIcon={EMPTY_SLOT_ICONS.lh} />
      <Hand label="Right hand" hand={slots.rh} ash={slots.rh_ash} emptyIcon={EMPTY_SLOT_ICONS.rh} />
    </div>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "slot",
    title: "Slot",
    section: "controls",
    size: "phone",
    states: [
      { label: "hands: none, and a weapon with its ash", render: (kit) => <Hands kit={kit} /> },
      {
        label: "small",
        render: (kit) => (
          <>
            <Small display={shown(kit, { spell: kit.samples.spell.id }).spell} emptyIcon={EMPTY_SLOT_ICONS.spell} />
            <Small
              display={shown(kit, { talisman_1: kit.samples.talisman.id }).talisman_1}
              emptyIcon={EMPTY_SLOT_ICONS.talisman}
            />
            <Small display={shown(kit, { item: kit.samples.item.id }).item} emptyIcon={EMPTY_SLOT_ICONS.item} />
          </>
        ),
      },
      {
        label: "small, none",
        render: (kit) => <Small display={shown(kit, { spell: null }).spell} emptyIcon={EMPTY_SLOT_ICONS.spell} />,
      },
      {
        label: "an armor set",
        render: (kit) => <Armor display={shown(kit, { armor: kit.samples.armorSet.id }).armor} />,
      },
      {
        label: "an armor set with none",
        render: (kit) => {
          const display = setShowing(kit, "none");
          return display === undefined ? null : <Armor display={display} />;
        },
      },
      {
        label: "an armor set with any",
        render: (kit) => {
          const display = setShowing(kit, "any");
          return display === undefined ? null : <Armor display={display} />;
        },
      },
      {
        label: "rules: red, and none",
        render: (kit) => {
          const slots = shown(kit, { rule_1: kit.samples.rule.id, rule_2: "none" });
          return (
            <>
              <RuleSlot name={nameOf(slots.rule_1)} />
              <RuleSlot name={nameOf(slots.rule_2)} />
            </>
          );
        },
      },
    ],
    Live: Hands,
    note: "The tiles, a named ash and an armor set's name open their wiki page; none and any have none.",
  },
];
