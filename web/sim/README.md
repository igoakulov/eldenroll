# Simulation

Plays whole runs the way a player would, from `Start run` until every boss is felled, and reports what they were shown. It is the main tool for tuning odds (`data/balance.md`): a first roll says little once decay starts pulling pools away from their odds.

```
cd web && pnpm sim --runs 50
```

`pnpm sim --help` lists the arguments. It writes to `data/build/sim/`: `report.md`, plus `objectives.csv` and `rolls.csv`, the row dump to parse for any question the report doesn't answer. Fifty runs per scenario take about two minutes.

## A run

- Every class is on, the boss setting is on, the weapon shortlist is off.
- Regions open one at a time by region level: the next is ticked when the open ones hold no living boss.
- Every third objective is rerolled once with `Full objective`; the replaced roll is in the dump with `kept` false and counts nowhere in the report.
- The player never uses `Felled?`: it adds nothing to roll statistics.
- Each scenario plays its own seeds, so scenarios are independent samples.

The engine shows the simulation every slot roll through `Engine.observe`, with the whole pool it drew from, so the dump holds each option's exact chance at roll time, with and without decay, rather than only what won.

## The simulated player

A character starts at level 1 with 10 in each stat and gains one level per felled boss.

Vigor, Mind and Endurance follow the same plan in every scenario: Vigor 20 by the end of Limgrave, 30 before Leyndell, 40 before Farum Azula, then 60; Mind 15 by the end of Limgrave, then 20; Endurance 25 between Liurnia and Leyndell. Each target's levels are spread evenly over its stretch of the run, so these stats rise beside the build rather than in a burst; the targets with no deadline are spread over the rest of the run.

The other levels go to the item stats, by scenario:

| Scenario | Plays like |
|---|---|
| ITEMS | `Max stat gap` 5; levels are saved and spent only to meet exactly what the rolled gear needs |
| STR | a Strength build rushing 80 Strength two-handed: 54 Str, 20 Dex, 25 Fth, then 67 Str with Dex, Int and Arc now and then |
| DEX | a Dexterity build: 20 Str, 80 Dex, 25 Fth |
| INT | a sorcerer: 80 Int |
| FTH | an incantation build: 80 Fth |
| ALL | someone who wants to wield everything and cares less about damage: every item stat evenly |

Once its targets are met, a scenario spreads the rest evenly over the item stats.

## Report

The predefined questions, each answered for all scenarios together and for each one:

- how often each class, right- and left-hand weapon class, talisman, ash, sorcery, incantation, item and armor set shows, and what never shows
- combat rules, and how many rule slots show `None` on an objective
- how soon a repeat comes back
- empty results by class and slot
- `Dual-Wield Warrior`: paired weapons, same-class pairs against the 75% aim, and the commonest mixed pairs. Which hand is heavier can't be told: the database holds no weights
- `Jester`'s right hand before Altus Plateau opens, before Leyndell opens, and over the whole run
- how far decay pulls `none` down in each pool that holds it, the rule `None` included
- how far decay pulls each slot's pool, and each class, from their odds
- every guarantee: how often it won and its chance at roll time, against the 99% acceptance in `data/balance.md#Tiers`; every softer boost the same way
- the planned synergies, step by step: bleed with the blood talisman and a White Mask set; rot or poison with the rot talisman and a Mushroom Crown set; the Claw Talisman with `Jump attacks only` and a jump set; a Dancer's weapon with the Dancer's set; the Blue Dancer Charm with a light set or `No armor`
- synergy talismans out of place: an exultation no boost brought in, the Blue Dancer Charm with heavier armor, the Claw and Axe Talismans without their rule

## Reading the dump

- A rolls row's `chance` is the chosen option's chance at roll time; `chance_no_decay` is the same with every decay removed. An empty result has chance 0.
- `boosts` lists the modifiers above ×1 active on any option in the pool, `boost_chances` the summed chance of the options each hit, `chosen_boosts` those on what won.
- A talisman boost is active in both talisman slots, and `talisman_2` leaves out what `talisman_1` rolled, so count a synergy per objective, not per roll.
- An objective's stats and level are those it rolled with; a level gained for felling its boss shows on the next one.
