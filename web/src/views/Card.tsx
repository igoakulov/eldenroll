import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { copy } from "../copy";
import { displaySlots } from "../engine/display";
import type { EngineData } from "../engine/engineData";
import { objectiveNumber, type Objective, type RerollTarget, type Run } from "../engine/run";
import { derivedLevel } from "../engine/settings";
import { BossBar } from "../ui/BossBar";
import { BottomBar, GlowBand, RuledButton } from "../ui/BottomBar";
import { SlotHeading } from "../ui/Headings";
import { Icon } from "../ui/Icon";
import { Screen } from "../ui/Screen";
import { RuleSlot } from "../ui/Slot";
import { WikiText } from "../ui/WikiLink";
import { FramedIconButton, LevelButton, TopBar } from "../ui/TopBar";
import { CHARACTER_CLASS_ICONS, EMPTY_SLOT_ICONS } from "./icons";
import { RerollPanel } from "./RerollPanel";
import { RunMenu, type RunMenuActions } from "./RunMenu";
import { Armor, Hand, Small, nameOf } from "./slots";
import "./Card.css";

/** How a card arrives: a new objective in full, a full-objective reroll quicker, or `Resume` with a fade only. */
export type Reveal = "full" | "quick" | "none";

/** A run between objectives shows `Level up` instead of the card. */
export type RunWithObjective = Run & { readonly current: Objective };

export function hasObjective(run: Run): run is RunWithObjective {
  return run.current !== null;
}

/** When the sequence ends at full speed (web/src/ui/README.md#Sequences); a tap anywhere ends it early. */
const REVEAL_MS = 1800;

/** The reveal's start times in ms at full speed, scaled by `--k` for a quick one. */
function at(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
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
  // Led by the part's name: siblings may hold the same id, as two `any` talismans or one weapon in both hands do
  const key = (part: string, ...ids: (string | null | undefined)[]) =>
    [part, ...ids.map((id) => id ?? "-")].join("|");
  return {
    boss: objective.boss,
    characterClass: objective.characterClass,
    lh: key("lh", slots.lh, slots.lh_ash),
    rh: key("rh", slots.rh, slots.rh_ash),
    spell: key("spell", slots.spell),
    talisman_1: key("talisman_1", slots.talisman_1),
    talisman_2: key("talisman_2", slots.talisman_2),
    armor: key("armor", slots.armor),
    item: key("item", slots.item),
    rule: key("rule", slots.rule),
  };
}

type Part = keyof ReturnType<typeof changeKeys>;

function changedParts(from: Objective, to: Objective): ReadonlySet<Part> {
  if (from === to) return new Set();
  const before = changeKeys(from);
  const after = changeKeys(to);
  return new Set((Object.keys(before) as Part[]).filter((part) => before[part] !== after[part]));
}

/** The current objective: the boss as the hero, then the class and the loadout to fell it with. Without `menu`, as
 * behind `Great enemy felled`, the menu button does nothing. */
export function Card({
  data,
  run,
  reveal,
  onReroll,
  onDone,
  onFelled,
  onLevelUp,
  menu,
}: {
  readonly data: EngineData;
  readonly run: RunWithObjective;
  readonly reveal: Reveal;
  readonly onReroll: (target: RerollTarget) => void;
  readonly onDone: () => void;
  readonly onFelled: () => void;
  readonly onLevelUp: () => void;
  readonly menu?: RunMenuActions;
}) {
  const [revealing, setRevealing] = useState(reveal !== "none");
  // `felled` outlives `open`, so the panel keeps its look while it fades out
  const [panel, setPanel] = useState({ open: false, felled: false });
  const [menuOpen, setMenuOpen] = useState(false);
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
    <TopBar eyebrow={copy.common.objective(objectiveNumber(run))}>
      <LevelButton level={level} onClick={onLevelUp} />
      <FramedIconButton icon="menu" label={copy.common.menu} onClick={() => setMenuOpen(true)} />
    </TopBar>
  );
  const runMenu = menu === undefined ? null : (
    <RunMenu open={menuOpen} run={run} actions={menu} onClose={() => setMenuOpen(false)} />
  );

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
          <RuledButton icon="reroll" onClick={() => setPanel({ open: true, felled: false })}>
            {copy.common.reroll}
          </RuledButton>
          <GlowBand onClick={onDone}>{copy.common.done}</GlowBand>
        </BottomBar>
      }
      sheet={
        <>
          <RerollPanel
            open={panel.open}
            felled={panel.felled}
            onClose={() => setPanel((last) => ({ ...last, open: false }))}
            onReroll={(target) => {
              setPanel((last) => ({ ...last, open: false }));
              onReroll(target);
            }}
            onFelled={() => {
              setPanel((last) => ({ ...last, open: false }));
              onFelled();
            }}
          />
          {runMenu}
        </>
      }
    >
      <div className="r" style={at(0)}>
        {top}
      </div>

      <section className="boss" aria-labelledby="boss-name">
        <Changed key={keys.boss} {...change("boss")}>
          <h1 className="boss-name r" id="boss-name" style={at(80)}>
            <WikiText url={boss?.url ?? null} className="boss-name-text" up>
              {boss?.name ?? copy.common.unknownBoss}
            </WikiText>
          </h1>
          <BossBar onFelled={() => setPanel({ open: true, felled: true })} />
          <p className="boss-location r" style={at(420)}>
            <Icon name="pin" size={15} />
            <span>{boss?.location}</span>
          </p>
        </Changed>
      </section>

      <Changed key={keys.characterClass} {...change("characterClass")}>
        <div className="class-head r" style={at(1000)}>
          <h2>{characterClass?.name ?? copy.common.unknownClass}</h2>
          <span className="class-icons" aria-hidden="true">
            {classIcons.map((icon, index) => (
              <Icon key={index} name={`${icon}-22`} size={20} />
            ))}
          </span>
        </div>
      </Changed>

      <div className="r weapons" style={at(1050)}>
        <SlotHeading>{copy.card.weapons}</SlotHeading>
        <div className="hands">
          <Changed key={keys.lh} {...change("lh")}>
            <Hand label={copy.card.leftHand} hand={slots.lh} ash={slots.lh_ash} emptyIcon={EMPTY_SLOT_ICONS.lh} />
          </Changed>
          <Changed key={keys.rh} {...change("rh")}>
            <Hand label={copy.card.rightHand} hand={slots.rh} ash={slots.rh_ash} emptyIcon={EMPTY_SLOT_ICONS.rh} />
          </Changed>
        </div>
      </div>

      <div className="r" style={at(1100)}>
        <SlotHeading>{copy.card.spell}</SlotHeading>
        <Changed key={keys.spell} {...change("spell")}>
          <Small display={slots.spell} emptyIcon={EMPTY_SLOT_ICONS.spell} />
        </Changed>
      </div>

      <div className="r" style={at(1150)}>
        <SlotHeading>{copy.card.talismans}</SlotHeading>
        <div className="talismans">
          <Changed key={keys.talisman_1} {...change("talisman_1")}>
            <Small display={slots.talisman_1} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
          </Changed>
          {objective.slots.talisman_2 === undefined ? null : (
            // A closed slot has no roll and no line (`web/src/engine/README.md#Closed slots`)
            <Changed key={keys.talisman_2} {...change("talisman_2")}>
              <Small display={slots.talisman_2} emptyIcon={EMPTY_SLOT_ICONS.talisman} />
            </Changed>
          )}
        </div>
      </div>

      <div className="r" style={at(1200)}>
        <SlotHeading>{copy.card.armor}</SlotHeading>
        <Changed key={keys.armor} {...change("armor")}>
          <Armor display={slots.armor} />
        </Changed>
      </div>

      <div className="r" style={at(1250)}>
        <SlotHeading>{copy.card.item}</SlotHeading>
        <Changed key={keys.item} {...change("item")}>
          <Small display={slots.item} emptyIcon={EMPTY_SLOT_ICONS.item} />
        </Changed>
      </div>

      <div className="r" style={at(1300)}>
        <SlotHeading>{copy.card.combatRule}</SlotHeading>
        <div className="rules">
          <Changed key={keys.rule} {...change("rule")}>
            <RuleSlot name={nameOf(slots.rule)} />
          </Changed>
        </div>
      </div>
    </Screen>
  );
}
