import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { ARMOR_PIECES, displaySlots, type SlotDisplay } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import { WAITING_MESSAGES, objectiveNumber, type Run } from "../engine/run";
import { derivedLevel } from "../engine/settings";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SlotHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { Screen } from "../ui/Screen";
import { Tile } from "../ui/Tile";
import { FramedIconButton, LevelButton, TopBar } from "../ui/TopBar";
import { ARMOR_PIECE_ICONS, CHARACTER_CLASS_ICONS, EMPTY_SLOT_ICONS, iconKey } from "./icons";
import "./Card.css";

/** How a card arrives: a new objective in full, a full-objective reroll quicker, or `Resume` with a fade only. */
export type Reveal = "full" | "quick" | "none";

/** When the sequence ends at full speed (internal/design.md#Sequences); a tap anywhere ends it early. */
const REVEAL_MS = 1800;

/** The reveal's start times in ms at full speed, scaled by `--k` for a quick one. */
function at(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}

/** The id the `none` item, the `None` armor pieces' alias and the rule `None` share. */
const NONE_ALIAS = "none";
const NONE: SlotDisplay = { kind: "none" };

function nameOf(display: SlotDisplay): string | null {
  switch (display.kind) {
    case "item":
      return display.item.name;
    case "alias":
      return display.label;
    case "rule":
      return display.rule.name;
    case "armor_set":
      return display.set.name;
    default:
      return null;
  }
}

function iconOf(display: SlotDisplay): string | null {
  return display.kind === "item" || display.kind === "alias" ? iconKey(display.item) : null;
}

/** What a slot shows as its name: the item, `none` in dim small caps, or `any` in gold italics. */
function SlotName({ display, className }: { readonly display: SlotDisplay; readonly className: string }) {
  if (display.kind === "none") return <span className={`${className} slot-none`}>none</span>;
  if (display.kind === "any") return <span className={`${className} slot-any`}>any</span>;
  return <span className={className}>{nameOf(display)}</span>;
}

/** Remounts when its `id` changes, and then fades in, so a reroll shows only what it changed. */
function Changed({ fade, children }: { readonly fade: boolean; readonly children: ReactNode }) {
  const [animate] = useState(fade);
  return <div className={animate ? "slot-changed" : undefined}>{children}</div>;
}

function Hand({ label, hand, ash, emptyIcon }: {
  readonly label: string;
  readonly hand: SlotDisplay;
  readonly ash: SlotDisplay;
  readonly emptyIcon: string;
}) {
  const empty = hand.kind === "none";
  return (
    <div className="hand">
      <Tile size="lg" icon={empty ? emptyIcon : iconOf(hand)} empty={empty} />
      <span className="small-label">{label}</span>
      <SlotName display={hand} className="slot-name" />
      {(ash.kind === "item" || ash.kind === "alias") && <span className="slot-ash">{nameOf(ash)}</span>}
    </div>
  );
}

function SmallSlot({ display, emptyIcon }: { readonly display: SlotDisplay; readonly emptyIcon: string }) {
  const empty = display.kind === "none";
  return (
    <div className="small-slot">
      <Tile size="sm" icon={empty ? emptyIcon : iconOf(display)} empty={empty} />
      <SlotName display={display} className="slot-name" />
    </div>
  );
}

function Armor({ display }: { readonly display: SlotDisplay }) {
  if (display.kind !== "armor_set") return <SmallSlot display={display} emptyIcon={ARMOR_PIECE_ICONS.body} />;
  return (
    <div className="armor">
      <span className="slot-name">{display.set.name}</span>
      <div className="armor-pieces">
        {ARMOR_PIECES.map((piece) => {
          // A `None` piece keeps the slot empty, unlike `any` (web/src/engine/README.md#Empty slots and aliases)
          const rolled = display.pieces[piece];
          const shown = rolled.kind === "alias" && rolled.item.alias === NONE_ALIAS ? NONE : rolled;
          return (
            <div className="armor-piece" key={piece}>
              <Tile size="sm" icon={ARMOR_PIECE_ICONS[piece]} empty={shown.kind === "none"} />
              <SlotName display={shown} className="armor-piece-name" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Rule({ display }: { readonly display: SlotDisplay }) {
  if (display.kind !== "rule" || display.rule.id === NONE_ALIAS) {
    return (
      <p className="rule">
        <SlotName display={display.kind === "rule" ? NONE : display} className="rule-name" />
      </p>
    );
  }
  return (
    <p className="rule">
      <span className="rule-lozenge" aria-hidden="true" />
      {display.rule.name}
    </p>
  );
}

/** The boss bar, broken in the middle by `Felled?`. As the boss arrives a whole bar fills over it, then gives
 * way as `Felled?` fades into the gap. */
function BossBar({ onFelled }: { readonly onFelled?: () => void }) {
  return (
    <div className="boss-bar">
      <div className="boss-bar-whole" aria-hidden="true">
        <i />
      </div>
      <div className="boss-bar-half boss-bar-left" aria-hidden="true">
        <i />
      </div>
      <button type="button" className="felled-link" onClick={onFelled}>
        <span className="felled-word">Felled</span>?
      </button>
      <div className="boss-bar-half boss-bar-right" aria-hidden="true">
        <i />
      </div>
    </div>
  );
}

/** The current objective: the boss as the hero, then the class and the loadout to fell it with. */
export function Card({
  data,
  run,
  reveal,
  onReroll,
  onDone,
}: {
  readonly data: EngineData;
  readonly run: Run;
  readonly reveal: Reveal;
  readonly onReroll: () => void;
  readonly onDone: () => void;
}) {
  const [revealing, setRevealing] = useState(reveal !== "none");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(() => setRevealing(false), REVEAL_MS * (reveal === "quick" ? 0.5 : 1));
    return () => window.clearTimeout(timer);
  }, [revealing, reveal]);

  const objective = run.current;
  const level = derivedLevel(run.stats);
  const top = (
    <TopBar eyebrow={`Objective ${objectiveNumber(run)}`}>
      <LevelButton level={level} />
      <FramedIconButton icon="menu" label="Menu" />
    </TopBar>
  );

  if (objective === null) {
    return (
      <Screen className="card">
        {top}
        <p className="card-waiting">{run.waiting === null ? "" : WAITING_MESSAGES[run.waiting]}</p>
      </Screen>
    );
  }

  const boss = data.bosses.get(objective.boss);
  const characterClass = data.database.character_class.find((row) => row.id === objective.characterClass);
  const slots = displaySlots(data, objective.slots);
  const fade = mounted.current;
  const classIcons = CHARACTER_CLASS_ICONS[objective.characterClass] ?? [];
  const keyOf = (...ids: (string | null | undefined)[]) => ids.map((id) => id ?? "-").join("|");

  return (
    <Screen
      className={`card${revealing ? " card-revealing" : ""}${reveal === "quick" ? " card-quick" : ""}`}
      onPointerDown={() => setRevealing(false)}
      bottom={
        <BottomBar className="r" style={at(1350)}>
          <RuledButton icon="reroll" onClick={onReroll}>
            Reroll
          </RuledButton>
          <GlowBand onClick={onDone}>Done</GlowBand>
        </BottomBar>
      }
    >
      <div className="r" style={at(0)}>
        {top}
      </div>

      <section className="boss" aria-labelledby="boss-name">
        <Changed fade={fade} key={objective.boss}>
          <h1 className="boss-name r" id="boss-name" style={at(80)}>
            {boss?.name ?? "unknown boss"}
          </h1>
          <BossBar />
          <p className="boss-location r" style={at(420)}>
            <Icon name="pin" size={15} />
            <span>{boss?.location}</span>
          </p>
        </Changed>
      </section>

      <Changed fade={fade} key={keyOf(objective.characterClass)}>
        <div className="class-head r" style={at(1000)}>
          <h2>{characterClass?.name ?? "unknown class"}</h2>
          <span className="class-icons" aria-hidden="true">
            {classIcons.map((icon, index) => (
              <Icon key={index} name={`${icon}-22`} size={20} />
            ))}
          </span>
        </div>
      </Changed>

      <div className="r weapons" style={at(1050)}>
        <SlotHeading>Weapons</SlotHeading>
        <div className="hands">
          <Changed fade={fade} key={keyOf(objective.slots.lh, objective.slots.lh_ash)}>
            <Hand label="Left hand" hand={slots.lh} ash={slots.lh_ash} emptyIcon={EMPTY_SLOT_ICONS.lh} />
          </Changed>
          <Changed fade={fade} key={keyOf(objective.slots.rh, objective.slots.rh_ash)}>
            <Hand label="Right hand" hand={slots.rh} ash={slots.rh_ash} emptyIcon={EMPTY_SLOT_ICONS.rh} />
          </Changed>
        </div>
      </div>

      <div className="r" style={at(1100)}>
        <SlotHeading>Spell</SlotHeading>
        <Changed fade={fade} key={keyOf(objective.slots.spell)}>
          <SmallSlot display={slots.spell} emptyIcon={EMPTY_SLOT_ICONS.spell} />
        </Changed>
      </div>

      <div className="r" style={at(1150)}>
        <SlotHeading>Talismans</SlotHeading>
        <div className="talismans">
          <Changed fade={fade} key={keyOf(objective.slots.talisman_1)}>
            <SmallSlot display={slots.talisman_1} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
          </Changed>
          <Changed fade={fade} key={keyOf(objective.slots.talisman_2)}>
            <SmallSlot display={slots.talisman_2} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
          </Changed>
        </div>
      </div>

      <div className="r" style={at(1200)}>
        <SlotHeading>Armor</SlotHeading>
        <Changed fade={fade} key={keyOf(objective.slots.armor)}>
          <Armor display={slots.armor} />
        </Changed>
      </div>

      <div className="r" style={at(1250)}>
        <SlotHeading>Item</SlotHeading>
        <Changed fade={fade} key={keyOf(objective.slots.item)}>
          <SmallSlot display={slots.item} emptyIcon={EMPTY_SLOT_ICONS.item} />
        </Changed>
      </div>

      <div className="r" style={at(1300)}>
        <SlotHeading>Combat rules</SlotHeading>
        <div className="rules">
          <Changed fade={fade} key={keyOf(objective.slots.rule_1)}>
            <Rule display={slots.rule_1} />
          </Changed>
          <Changed fade={fade} key={keyOf(objective.slots.rule_2)}>
            <Rule display={slots.rule_2} />
          </Changed>
        </div>
      </div>
    </Screen>
  );
}
