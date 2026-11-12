import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { ARMOR_PIECES, displaySlots, type SlotDisplay } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import { WAITING_MESSAGES, objectiveNumber, type Objective, type RerollTarget, type Run } from "../engine/run";
import { derivedLevel } from "../engine/settings";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SlotHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { Screen } from "../ui/Screen";
import { Tile } from "../ui/Tile";
import { FramedIconButton, LevelButton, TopBar } from "../ui/TopBar";
import { ARMOR_PIECE_ICONS, CHARACTER_CLASS_ICONS, EMPTY_SLOT_ICONS, iconKey } from "./icons";
import { RerollPanel } from "./RerollPanel";
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

/** Remounts when its key changes, and then fades in, so a reroll shows only what it changed. While `leaving`, it
 * fades out first and calls `onLeft` once gone. */
function Changed({ fade, leaving, onLeft, children }: {
  readonly fade: boolean;
  readonly leaving: boolean;
  readonly onLeft: () => void;
  readonly children: ReactNode;
}) {
  const [animate] = useState(fade);
  return (
    <div
      className={leaving ? "slot-leaving" : animate ? "slot-changed" : undefined}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onLeft();
      }}
    >
      {children}
    </div>
  );
}

/** One key per part of the card that fades as a whole when a reroll changes it. */
function changeKeys(objective: Objective) {
  const { slots } = objective;
  const key = (...ids: (string | null | undefined)[]) => ids.map((id) => id ?? "-").join("|");
  return {
    boss: objective.boss,
    characterClass: objective.characterClass,
    lh: key(slots.lh, slots.lh_ash),
    rh: key(slots.rh, slots.rh_ash),
    spell: key(slots.spell),
    talisman_1: key(slots.talisman_1),
    talisman_2: key(slots.talisman_2),
    armor: key(slots.armor),
    item: key(slots.item),
    rule_1: key(slots.rule_1),
    rule_2: key(slots.rule_2),
  };
}

type Part = keyof ReturnType<typeof changeKeys>;

function changedParts(from: Objective | null, to: Objective | null): ReadonlySet<Part> {
  if (from === null || to === null || from === to) return new Set();
  const before = changeKeys(from);
  const after = changeKeys(to);
  return new Set((Object.keys(before) as Part[]).filter((part) => before[part] !== after[part]));
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
  onLevelUp,
}: {
  readonly data: EngineData;
  readonly run: Run;
  readonly reveal: Reveal;
  readonly onReroll: (target: RerollTarget) => void;
  readonly onDone: () => void;
  readonly onLevelUp: () => void;
}) {
  const [revealing, setRevealing] = useState(reveal !== "none");
  const [panelOpen, setPanelOpen] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(() => setRevealing(false), REVEAL_MS * (reveal === "quick" ? 0.5 : 1));
    return () => window.clearTimeout(timer);
  }, [revealing, reveal]);

  // A reroll keeps the card: the parts it changed fade out, then the new ones fade in, and the rest stay still
  const [objective, setShown] = useState(run.current);
  const changing = changedParts(objective, run.current);
  if (objective !== run.current && changing.size === 0) setShown(run.current);

  const level = derivedLevel(run.stats);
  const top = (
    <TopBar eyebrow={`Objective ${objectiveNumber(run)}`}>
      <LevelButton level={level} onClick={onLevelUp} />
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
  const classIcons = CHARACTER_CLASS_ICONS[objective.characterClass] ?? [];
  const keys = changeKeys(objective);
  const change = (part: Part) => ({
    fade: mounted.current,
    leaving: changing.has(part),
    onLeft: () => setShown(run.current),
  });

  return (
    <Screen
      className={`card${revealing ? " card-revealing" : ""}${reveal === "quick" ? " card-quick" : ""}`}
      onPointerDown={() => setRevealing(false)}
      bottom={
        <BottomBar className="r" style={at(1350)}>
          <RuledButton icon="reroll" onClick={() => setPanelOpen(true)}>
            Reroll
          </RuledButton>
          <GlowBand onClick={onDone}>Done</GlowBand>
        </BottomBar>
      }
      sheet={
        <RerollPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onReroll={(target) => {
            setPanelOpen(false);
            onReroll(target);
          }}
        />
      }
    >
      <div className="r" style={at(0)}>
        {top}
      </div>

      <section className="boss" aria-labelledby="boss-name">
        <Changed key={keys.boss} {...change("boss")}>
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

      <Changed key={keys.characterClass} {...change("characterClass")}>
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
          <Changed key={keys.lh} {...change("lh")}>
            <Hand label="Left hand" hand={slots.lh} ash={slots.lh_ash} emptyIcon={EMPTY_SLOT_ICONS.lh} />
          </Changed>
          <Changed key={keys.rh} {...change("rh")}>
            <Hand label="Right hand" hand={slots.rh} ash={slots.rh_ash} emptyIcon={EMPTY_SLOT_ICONS.rh} />
          </Changed>
        </div>
      </div>

      <div className="r" style={at(1100)}>
        <SlotHeading>Spell</SlotHeading>
        <Changed key={keys.spell} {...change("spell")}>
          <SmallSlot display={slots.spell} emptyIcon={EMPTY_SLOT_ICONS.spell} />
        </Changed>
      </div>

      <div className="r" style={at(1150)}>
        <SlotHeading>Talismans</SlotHeading>
        <div className="talismans">
          <Changed key={keys.talisman_1} {...change("talisman_1")}>
            <SmallSlot display={slots.talisman_1} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
          </Changed>
          <Changed key={keys.talisman_2} {...change("talisman_2")}>
            <SmallSlot display={slots.talisman_2} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
          </Changed>
        </div>
      </div>

      <div className="r" style={at(1200)}>
        <SlotHeading>Armor</SlotHeading>
        <Changed key={keys.armor} {...change("armor")}>
          <Armor display={slots.armor} />
        </Changed>
      </div>

      <div className="r" style={at(1250)}>
        <SlotHeading>Item</SlotHeading>
        <Changed key={keys.item} {...change("item")}>
          <SmallSlot display={slots.item} emptyIcon={EMPTY_SLOT_ICONS.item} />
        </Changed>
      </div>

      <div className="r" style={at(1300)}>
        <SlotHeading>Combat rules</SlotHeading>
        <div className="rules">
          <Changed key={keys.rule_1} {...change("rule_1")}>
            <Rule display={slots.rule_1} />
          </Changed>
          <Changed key={keys.rule_2} {...change("rule_2")}>
            <Rule display={slots.rule_2} />
          </Changed>
        </div>
      </div>
    </Screen>
  );
}
