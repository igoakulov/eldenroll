# Simulation

Plays whole runs the way a player would, from `Start run` until every boss is felled, and counts what they were shown. It is the main tool for tuning odds (`data/balance.md`): a first roll says little once the catch-up boost starts shifting pools as regions open.

Two front ends read the same runs from `simulate.ts`: the page at `/simulate/`, for reading, and `pnpm sim`, a row dump for questions the page doesn't answer.

```
cd web && pnpm sim --runs 50
```

`pnpm sim --help` lists the arguments. Each call writes `objectives.csv` and `rolls.csv` to its own timestamped folder under `data/build/sim/`, never overwriting an earlier one. Fifty runs of each of the seven stat allocations take about three minutes. The page and the dump take the same seed to the same runs (`runSeed`). Both read `data/build/db.json`, so a change to `data/overrides/` shows only after the database is rebuilt (`pipeline/README.md`); the page needs a reload to fetch it.

## A run

- Every class is on and the weapon shortlist is off.
- Regions open one at a time, by region level with one exception: nobody clears a region before moving on, so the next opens once a share of this one is felled (rounding up, half by default), not when it's fully clear. The DLC plays out of level order too: `Gravesite Plain`, `Shadow Keep` and `Abyssal Woods` open after Farum Azula and before Haligtree and the Ashen Capital; `Jagged Peak` (its dragons) and `Enir-Ilim` open only after those two.
- A run limited to some regions skips the others in that order and ends once every boss in its regions is felled. The simulated player's stat targets still follow the whole order: a target due by a region the run leaves out is due by the next one it plays.
- The player never rerolls or uses `Felled?`: a discarded roll changes no probability, so neither adds anything to roll statistics.
- Each stat allocation plays its own seeds, so allocations are independent samples.

The engine shows the simulation every slot roll through `Engine.observe`, with the whole pool it drew from and each option's catch-up boost apart, so the dump can give the winner's exact chance at roll time and the chance of `none` and of every boosted option in the pool. Every option's chance, with the catch-up boost and without, is summed only for the page (`ChanceSums`).

## The simulated player

A character starts at level 1 with 10 in each stat and gains one level per felled boss.

Vigor, Mind and Endurance follow the same plan in every stat allocation: Vigor 20 by the end of Limgrave, 30 before Leyndell, 40 before Farum Azula, then 60; Mind 15 by the end of Limgrave, then 20; Endurance 25 between Liurnia and Leyndell. Each target's levels are spread evenly over its stretch of the run, so these stats rise beside the build rather than in a burst; the targets with no deadline are spread over the rest of the run.

The other levels go to the item stats, by stat allocation:

| Allocation | Plays like |
|---|---|
| ITEMS | `Max stat gap` 5; levels are saved and spent only to meet exactly what the rolled gear needs |
| STR | a Strength build rushing 80 Strength two-handed: 54 Str, 20 Dex, 25 Fth, then 67 Str with Dex, Int and Arc now and then |
| DEX | a Dexterity build: 20 Str, 80 Dex, 25 Fth |
| INT | a sorcerer: 80 Int |
| FTH | an incantation build: 80 Fth |
| ARC | a bleed and status build, sometimes played by `Spellblade` with Arcane incantations: 25 Dex, then 16 Str with 60 Arc, then 25 Fth, then Dex and Str evenly |
| ALL | someone who wants to wield everything and cares less about damage: every item stat evenly |

Once its targets are met, an allocation spreads the rest evenly over the item stats.

## The page

`/simulate/` runs the simulation in the browser, in a worker, one stat allocation at a time and at most ten runs, so a run stays inside a page load; anything wider is the dump's job. It is its own Vite page and bundle, like the UI kit, built from the kit's components and words in `src/copy.ts`; its code is in `src/simulate/`, and what it counts is in `aggregate.ts`. Settings, seed, tab and filters live in the address, so a link reproduces a result; the first run plays as the page opens, and later ones on `Simulate`.

- **Each tab answers one question**: Overview, what the runs looked like; Slots, what each slot shows; Boosts, whether the modifiers do their job; Variety, how evenly a run spreads what it shows; Items, how one item fared. A new section goes in the tab whose question it answers.
- **The class filter reads, never reruns.** Every run plays every class; the filter combines whatever classes are picked across every tab, boosts and items included, since every roll knows its class.
- **A share table lists everything that was in reach**, at 0 when it never showed: an option counts as in reach when some roll of a picked class offered it, in a pool of that slot. Long tables show their first 10 rows and fold the rest behind `Show all`.
- **A share from fewer than 20 objectives fades**: one run limited to a region or two is a thin sample.
- **Right and left hand show a second share as a tick**: what the class would get if every weapon class held as many weapons, so a skew from pool size reads apart from one from catch-up, stat gates or a modifier. With several classes picked, each class's adjusted share counts by its objectives.
- **The Variety tab groups catch-up by an item's earliest region**, the one whose `run_left` caps its boost.
- **The Items tab inspects items one at a time**: every option in reach, with how often it showed, the share of runs it showed in and the most its catch-up boost can reach, and, for whatever the search matches, its chance at roll time over the run beside the same chance with the catch-up boost removed from every option, so the boost's effect reads directly. The chances come from `ChanceSums`, each option's chance added up per class, slot and 20 objectives while the run plays, which the page needs and the dump leaves out. The second talisman and combat rule slots leave out what the first rolled, so only the first is charted; a showing in either marks it.
- **Settings live in the address** (`src/simulate/inputs.ts`), so an agent can open a result directly, such as `/simulate/?runs=10&allocation=STR&regions=limgrave,liurnia&classes=jester&tab=items&q=torch`.
- **Guarantees pass at 99% of the rolls where they're in play** (`data/balance.md#Tiers`), and name what won when they lost. Modifiers read as generated sentences from their conditions and targets, so a new row needs no wording.
- Hand pairs and Dual-Wield's same-class aim come from the database's classes alone: which hand is heavier can't be told, since it holds no weights.

## Reading the dump

- A rolls row's `chance` is the chosen option's chance at roll time and `catch_up` its catch-up boost. An empty result has chance 0.
- `boosts` lists the modifiers above ×1 active on any option in the pool, `boost_chances` the summed chance of the options each hit, `chosen_boosts` those on what won.
- A talisman boost is active in both talisman slots, and `talisman_2` leaves out what `talisman_1` rolled, so count a synergy per objective, not per roll.
- An objective's stats and level are those it rolled with; a level gained for felling its boss shows on the next one.
- In `objectives.csv`, a blank slot is one the class doesn't roll; `(empty)` is a roll that found nothing.
- `chosen` is the item that rolled; `chosen_key` is what showings count by, so an alias's members share one key (`alias:any_staff`), and `none` is one key across every slot.
- `none_chance` is `none`'s chance in pools that hold it.
