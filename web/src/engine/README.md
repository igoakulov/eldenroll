# Engine

The rules of an EldenRoll run, and the code that rolls it. Plain TypeScript with no React: the UI holds a `Run` and calls its actions. This file holds what the code doesn't say plainly: the run as the player sees it, the reasons, and the traps. Values live in code (`settings.ts`, `hyperparams.ts`, `run.ts`) and data (`data/overrides/`); each module's tests are its spec in practice. Row meanings are in `data/README.md#Rows`.

## Modules

| Module | Holds |
|---|---|
| `engineData.ts` | indexes built once from `db.json` |
| `eligibility.ts` | which location rows count (#Eligibility); `countedItems` also counts every item with no row, everywhere |
| `regions.ts` | selected locations, the Ashen Capital and Maliketh rules, the boss pool |
| `slotRoll.ts` | one pool: filters, odds, modifiers, decay, removal counts, sampling |
| `loadout.ts` | every slot in roll order, ash and spell rules, rerolls, the weapon shortlist |
| `run.ts` | the run as plain data and every action |
| `display.ts` | what each card row shows |
| `hyperparams.ts` | balance values passed in, so a hidden page can tune them live; game mechanics never go here |

## Pitfalls

- **Filters come in two kinds** (`PoolFilters` in `slotRoll.ts`). `rules` are game rules: always applied, never traced. Player inputs (`never roll`, region, boss status, stats) are counted and traced, and so are `×0` modifiers, by id. A new filter must pick its side.
- **Decay compounds** per `repeatKey`: `item:x`, `rule:x`, `armor_set:x`, `character_class:x`, or `alias:x` for an alias member. An objective counts once however many slots showed the same thing. `Never roll` keys on `optionKey` instead, which never names an alias.
- **`none` is one key across all slots,** so decay hits it on almost every objective: `Jester`'s empty RH and the rule `None` fade fast.
- **A reroll** keeps the slots and trace blocks before its target, rolls the rest, and leaves out only the target's current result unless nothing else is left.
- **Determinism.** The generator's state lives in `run.rngState`, and tables are iterated in file order. Every action returns a new `Run`; keep the returned one, or reproducibility breaks.
- **Ash fit, ash duplication and spell type** depend on a hand but hold for every class, so they are filters, not modifiers.

## Using it from the UI

- Build `Engine` once from the loaded `db.json`.
- Before a run exists, the Start view holds plain `RunInputs`. `startRun` needs a 32-bit seed from the UI (the engine never calls `Math.random`) and returns either a run or the exact messages to show. After start, edits go through `editRun`, and bosses through `setBossState`, which returns the same run for a locked boss. So the boss controls have two paths: arrays before the run, run actions after.
- `displaySlots` returns rows in card order. An `alias` armor piece is a `None` piece: the set keeps that slot empty, so the player wears nothing there, while `any` means they wear what they like. Make the two easy to tell apart.
- The roll order differs from the card order: compute and show the slots a reroll will change in roll order (#Rerolls), where they always form one run; the panel lists it reversed, to match the slider. In card order a kept slot can sit between two that change.
- A slot the class has no row for can't be rerolled: `reroll` returns the run unchanged.
- `done` still rolls the next objective at once, and `alreadyDead` keeps the loadout; both change to #Lifecycle.
- Print the trace in development only after an action that rolls, from the action handler, not a React effect: `StrictMode` runs effects twice.
- Keep UI state in plain data, so a save layer can store it.

## Run model

An objective is a boss instance, a class loadout and 2 combat rules. The player acquires the loadout unless already owned, equips it, defeats the boss and obeys the rules. Completion is self-reported. Two talismans always roll, even for an early character with fewer slots. Only the first weapon in each hand is constrained; other weapon slots, consumables and spirit ashes are free. Combat rules win over the loadout.

- **Owned** means it appeared in a completed objective this run; nothing else is known about the player's inventory.
- **Felled** (code: `dead`) is a boss out of the run, by `Done`, `Felled?` or `Bosses`. **Skipped** keeps a boss out of the boss pool while it stays alive for its items.
- The objective number is completed + 1; rerolls don't change it.

### Lifecycle

1. `Start run` validates inputs and rolls objective 1.
2. `Done` marks the objective completed and its boss felled, stores the snapshot and applies decay. `Great enemy felled` counts down 5 seconds with `Undo`, which restores the run exactly. `Level up` follows, to update stats and regions, then `Roll objective N`. If the selected regions hold no living boss, the run waits with no current objective until more are ticked.
3. `Felled?` is for a boss felled before this objective: it marks it felled, so its items unlock, and rerolls the full objective after the same countdown, reading `Rerolling in`, with no `Level up`.
4. `Finish run` works at any time; the current objective is discarded unless `Done`. The run finishes by itself when every boss with `odds > 0` is felled or skipped, whatever the regions. Once Maliketh is felled, a Royal Capital boss left alive outside the Shunning-Grounds doesn't count: his death turns the city to ash.
5. `New run` finishes the current run as `Finish run` does, then clears all run state.

### Rerolls

Unlimited; they never change the objective number or any probability, and a discarded roll adds no ownership or decay. A slider with 9 stops picks the scope; its target and every slot after it in the roll order re-roll:

```
boss → character_class → rh → rh_ash → lh → lh_ash → spell → item → talisman_1 → talisman_2 → rule_1 → rule_2 → armor
```

| Stop | Target |
|---|---|
| `Armor only` | `armor` |
| `Rules` | `rule_1` |
| `Talismans` | `talisman_1` |
| `Item` | `item` |
| `Spell` | `spell` |
| `Left hand` | `lh` |
| `Both hands` | `rh` |
| `New class` | `character_class` (the panel opens here) |
| `Full objective` | `boss` |

Armor is last, so every reroll rerolls armor. A scope can skip a slot the card shows between two that change: `Talismans` keeps the item.

Why this order: weapons gate ashes and rule requirements, talismans gate rule odds, rules gate armor synergies, and nothing rolls after armor.

### Edits during a run

Every input and setting stays editable; changes apply on the next roll and never touch the current objective.

## Inputs

- **Stats** are typed by hand and impossible builds are accepted, but a run can't start below level 1. Gear, Great Runes and buffs are ignored; two-handing is the only adjustment.
- **Regions** are the only progression input: no boss level or rune filter. Region 1 is the default, because region 2 bundles Mohgwyn and region 3 is a higher level band. Selecting the Ashen Capital drops the Royal Capital silently, except the Shunning-Grounds, which both reach. A felled Maliketh drops the Royal Capital the same way without selecting the Ashen Capital's areas.
- **`Max stat gap`** is per item, never a shared loadout budget.
- **Weapon shortlist** is in #Weapon shortlist; **`Boss gear locked until felled`** in #Eligibility.

## Bosses

Each fight is its own instance: felling one says nothing about another fight of the same boss, and a boss fought in four places is four objectives. An instance is reused across runs, never within one.

## Classes

Pools are `data/overrides/slot_pools.csv`. Odds and the class rules (Dual-Wield Warrior pairs, paired weapons, Knight's thrusting shield, Jester's right hand) are explained in `data/balance.md#Classes with extra rules`. What the engine itself does:

- **Catalysts** are scoped by selectors, not odds, and the build checks it: staves in `Sorcerer`, seals in `Pyromancer`, both in `Spellblade` LH, and one staff in `Jester` RH, `Demi-Human Queen's Staff`, there for `Spinning Weapon`, from the same region as that ash. The card shows only `Any staff`, so one is enough.
- **A rolled catalyst decides the spell type,** for every class and hand, RH winning, so `Any seal` never pairs with a sorcery.
- `Sorcerer` and `Pyromancer` are separate so a player levelling only INT or only FTH can drop the other.
- A Knight's thrusting shield always leaves LH empty, so it gets the two-handing bonus.
- `Any torch` and `Any perfume bottle` can show an ash line though only some members hold one: the rolled member does.

## Two-handing

RH is two-handed when LH is empty and the item has `str_bonus_2h`; the bonus applies to the Strength requirement only (`stats.ts`). LH is empty when it rolled `none` or its pool was empty; `any` is undecided, never empty. RH rolls first, so it looks ahead: LH counts as empty when `none` is all it could roll after that RH.

## Empty slots and aliases

| Situation | Example | Mechanism | Shows |
|---|---|---|---|
| slot not randomized | talismans 3 and 4, a set's missing piece, a caster's ash | no slot row | `any` |
| randomized, empty on purpose | `2H Warrior` LH, `Jester` RH | the pool holds the `none` row | `none` |
| randomized, nothing survives the filters | a narrow pool | empty result | `none` |

- **`none`** is an ordinary item row. Selectors skip it unless they name it, so "all greatshields" can never remove it.
- **`any`** is a slot state, never sampled, owned, decayed or counted.
- **An alias** is a label over real items. The engine rolls a concrete member with its own odds and filters and shows the label, so the alias's chance is the sum of its members' and it vanishes when no member survives. Ownership, decay and the summary use the label; the trace names the member. A synthetic "any staff" item would need its own odds, eligibility and distinctness rules, so it stays a label.
- **Ash line.** A rolled ash shows its name or label; no ash row or an empty pool shows `any`; a hand that rolled `none` shows `none`.

## Combat rules

A rule is its name and nothing else, so the name says the whole rule: `Land a riposte` means landing one on the boss; `L2 only` means attacking only with the skill, whatever the FP. Each requirement, exclusion and synergy is a row in `data/overrides/modifiers.csv`, explained rule by rule in `data/balance.md#Conditional rules`.

- `No talismans` is advisory: talismans roll first, so they show and the player ignores them. `No armor` makes the `Naked Set` top tier instead, because armor rolls after the rules.
- `No healing flasks` allows healing items, spells and blocking, and doesn't forbid the Flask of Wondrous Physick.
- Rules have no location filter, so the tears that come only from DLC bosses sit at `odds = 0` (`data/balance.md#Parked crystal tears`).
- Requirements remove a rule the loadout can't obey, and exclusions keep two contradicting rules apart.
- With the felled-boss setting on, a trigger or target from a boss waits until it is felled; a modifier whose target is filtered out is simply inactive.

## Weapon shortlist

The player lists favourite or upgraded weapons and greatshields; with the checkbox on, RH first rolls from the listed items its selectors allow. A listed item skips location, boss status and stat deficit, because the player already holds it; selectors, `odds = 0`, duplicates and modifiers still apply. If nothing listed survives, RH rolls its usual pool, so a `Ranger` with no bow listed gets a new bow. Only RH reads the list, so LH keeps its variety. With the checkbox off the list is kept: roll new weapons for a while, upgrade a few, turn it back on. It is the one exception to "multipliers only", because it is a player setting, not a synergy.

## Eligibility

An item rolls if at least one of its location rows counts (`eligibility.ts`). A place row counts when its region is selected. With `Boss gear locked until felled` on, a boss row counts once the boss is felled, whatever the region, and never before: Radahn's weapons stay out while he lives, even with Caelid ticked, and keep rolling after he falls with Caelid unticked. Off, a boss row counts by the boss's region. A boss at `odds = 0` always counts by region, like a regular enemy, and is absent from `Bosses`.

- A boss is known felled only through `Done`, `Felled?` or `Bosses`; skipped bosses are presumed alive. With the setting off, felled bosses still leave the boss pool; off is mainly for testing.
- An item with no location row counts everywhere: consumables, whose result names a family the player fills with any variant, and the `None` pieces. A set rolls only if every piece is reachable.

## Decay

On `Done`, everything the objective showed decays: class, items, ashes, spells, talismans, armor set, rules and `none`. A shortlisted weapon decays like any other, so it only competes less against the rest of the list. `any` and empty results don't decay, and nothing carries across runs.

## Trace

Every roll emits a plain-text trace, stored on the objective and printed in development; editing prints nothing. It is for spotting an odd roll in a play-test and finding what to tune, so it shows only what player inputs and modifiers remove; game rules are applied before counting, with no line. The format is pinned by `trace.test.ts`.

## Design constraints

Each exists because the alternative was tried and failed.

1. Regions, not boss levels or runes, are the progression input: level data was unreliable.
2. `region_level` orders the checkbox list and never filters: a second list in the frontend drifts.
3. `DLC: ` lives in the region name, with no `dlc` column: pool logic is region-based.
4. `none` is an item row, `any` a slot state, `Any X` an alias label: one mechanism each.
5. Base odds are a column on every row that rolls; a modifier is for a condition, never for regular balancing, because one row per adjusted option would bury the real rules.
6. One selector dialect, `{kind, ids}`, for pools and modifier targets: two dialects drift.
7. Armor rolls last, always, so armor synergies need no post-roll step.
8. Anything that depends on another slot is a modifier, everything else a filter, with ash fit, ash duplication and spell type as the exceptions.
9. Multipliers only, no force pass: 100% is not worth a second ordering mechanism.
10. One flat `item` table with nullable typed columns: polymorphic keys are worse than a few nulls.
11. Bosses are flat instances: felling one fight says nothing about another.
12. Display labels never come from data rows, so no missing row can break a screen.
13. Vocabulary is build-time constants: a shipped categories table means a join for a label.
14. The mod's `item_info` is a lookup, never the catalog: most of its names can never roll.
15. Location filters existence, not odds: an unreachable item is gone before odds apply, and no modifier brings it back.
16. A slot's scope is absence, not zero odds: catalysts, torches and perfume bottles are kept out by selectors, because they roll elsewhere; `odds = 0` is for an option that rolls nowhere.
17. Removal is deletion, not a flag: an excluded item never reaches `db.json`, and an option kept but never rolled is a row at `odds = 0`.
18. Boss status is a filter, and a boss's odds decide only whether it is an objective: it depends on run state, not another slot.
