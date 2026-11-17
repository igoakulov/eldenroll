# Simulation

Plays whole runs the way a player would, from `Start run` until every boss is felled, and counts what they were shown. It is the main tool for tuning odds (`data/balance.md`): a first roll says little once the catch-up boost starts shifting pools as regions open.

Two front ends read the same runs from `simulate.ts`: the page at `/sim/`, for reading, and `pnpm sim`, a row dump for questions the page doesn't answer.

```
cd web && pnpm sim --runs 50
```

`pnpm sim --help` lists the arguments. Each call writes `metrics.md`, `vs-fair.csv`, `objectives.csv` and `rolls.csv` to its own timestamped folder under `data/build/sim/`, never overwriting an earlier one. Fifty runs of each of the seven stat allocations take about three minutes. The page and the dump take the same seed to the same runs (`runSeed`). Both read `data/build/db.json`, so a change to `data/overrides/` shows only after the database is rebuilt (`pipeline/README.md`); the page needs a reload to fetch it.

## A run

- Every class is on and the weapon shortlist is off.
- Regions open one at a time, by region level with one exception: nobody clears a region before moving on, so the next opens once a share of this one is felled (rounding up, half by default), not when it's fully clear. Leyndell, Farum Azula, the Ashen Capital and Enir-Ilim are the exception: the game leads through them end to end, so each is felled in full before the next opens. The DLC plays out of level order too: `Gravesite Plain`, `Shadow Keep` and `Abyssal Woods` open after Farum Azula and before Haligtree and the Ashen Capital; `Jagged Peak` (its dragons) and `Enir-Ilim` open only after those two.
- A run limited to some regions skips the others in that order and ends once every boss in its regions is felled. The simulated player's stat targets still follow the whole order: a target due by a region the run leaves out is due by the next one it plays.
- The player never rerolls or uses `Felled?`: a discarded roll changes no probability, so neither adds anything to roll statistics.
- Each stat allocation plays its own seeds, so allocations are independent samples.

The engine shows the simulation every slot roll through `Engine.observe`, with the whole pool it drew from and each option's catch-up boost apart, so the dump can give the winner's exact chance at roll time and the chance of `none` and of every boosted option in the pool. Every option's chance, with the catch-up boost and without, is summed for the page and `metrics.md` (`ChanceSums`).

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

`/sim/` runs the simulation in the browser, in a worker, one stat allocation at a time and at most ten runs, so a run stays inside a page load; anything wider is the dump's job. It is its own Vite page and bundle, like the UI kit, its `index.html` in this folder for the shorter address, built from the kit's components and words in `src/copy.ts`; its code is in `src/sim/`, and what it counts is in `aggregate.ts`. Settings, seed, tab and filters live in the address, so a link reproduces a result; the first run plays as the page opens, and later ones on `Simulate`.

- **Each tab answers one question**: Overview, what the runs looked like and how often they repeat; Slots, what each slot shows; Synergies, whether the modifiers do their job; Items, how one item fared and what never showed. A new section goes in the tab whose question it answers.
- **The class filter reads, never reruns.** Every run plays every class; the filter combines whatever classes are picked across every tab, synergies and items included, since every roll knows its class. Three counts read past it: Overview's run summary, which describes whole runs; Overview's class shares, out of every class's objectives so a class's share holds still; and an Items chart's "shown by" line, which says so.
- **Counts are per run.** A run is the unit a result is judged and tuned by; more runs only widen the sample. Every count the page shows is per run, in tables, ledes and pass rates alike; the number of runs is the only total.
- **A share table lists everything that was in reach**, at 0 when it never showed, with the share of runs it showed in and, on items and sets, the mean catch-up boost while it was in a pool after `inPool` (`data/balance.md#Hyperparameters`), so an early item reads below ×1, won or not, each pool weighted by its chance there without the boost, as the Items charts read it: an option counts as in reach when some roll of a picked class offered it, in a pool of that slot. Long tables show their first 10 rows and fold the rest behind `Show all`.
- **A share from fewer than 20 objectives fades**: one run limited to a region or two is a thin sample.
- **Slots count by item, by weapon class or by region**, one switch for every table of items so they read alike; only the hands count by weapon class, and the combat rules, which have no location, never switch, nor do the tables of pairs and empty results. Those two counts add Vs fair, the share divided by a fair share, 1.00 being even, so a skew from pool size reads apart from one from catch-up, stat gates or a modifier; sorted, every Vs fair column puts the furthest from 1.00 first, half and double as far; the fair share is:
  - By weapon class, what the class would get if every weapon class held as many weapons. With several classes picked, each class's adjusted share counts by its objectives.
  - By region, what the region would get if every option in reach in that slot showed equally. A region's name starts with its number in play order, as in the settings, and sorts by it. An item counts in the region where it first comes into reach in play order, a set where its last piece does; `none` is left out, and every roll counts, so two talisman slots count twice. In reach here means a pool of that slot offered the item itself: an alias's members count apart, each in its own region, so a member a class never meets doesn't count because its alias was offered.
- **Furthest from fair, after the armor sets on the Slots tab whatever the tables count by, lists only gaps that matter for play** (`data/balance.md#Fair share`), largest first: a line is one region of one slot for one picked class alone, listed when its Vs fair is outside 0.8–1.25, its gap is at least half a showing a run, and the gap passes three standard deviations of its sample, so it isn't luck. A line's showings vary from run to run no more than chance alone would make them, so its standard deviation over the sample is √(its fair showings); one build's view holds hundreds of lines, so at three about one is listed by luck. Then, for each slot and region, the classes not listed alone are summed, each against its own fair share, and listed as classes together when the sum passes, so a shortfall every class shares shows though no class is short enough alone. Showings, the fair share and the gap read per run, as everywhere on the page. The bar falls to half a showing only near 36 runs per showing a run the line expects, so the page's 1 and 10 runs list only large gaps; tuning reads the dump at 50 runs per stat allocation. The item slot is left out, its odds differing by design.
- **The Items tab inspects items one at a time**: for whatever the search matches, up to ten so a whole armor set with its variants fits, its chance at roll time over the run beside the same chance with the catch-up boost removed from every option, so the boost's effect reads directly. The chances come from `ChanceSums`, each option's chance added up per class, slot and 20 objectives while the run plays. The second talisman and combat rule slots leave out what the first rolled, so only the first is charted; a showing in either marks it.
- **Settings live in the address** (`src/sim/inputs.ts`), every one of them, defaults included, so a link reads whole; `all` stands for every region or class, and a setting left out takes its default. An agent can open a result directly, such as `/sim/?runs=10&allocation=STR&regions=limgrave,liurnia&classes=jester&tab=items&q=torch`.
- **An ash counts by the hand that rolled it**: in the shield table on a small, medium or greatshield, in the weapon table on anything else, a thrusting shield included. An ash fitting both, such as `Parry`, counts where it rolled, and is in reach in a table only if a hand of that kind was offered it.
- **Empty results count rolls that found nothing where something could have rolled**: not a slot whose only roll is `none`, nor an ash slot whose hand can't hold an ash, such as a somber weapon.
- **Synergies list every boosting modifier, with no pass mark**, bar Dual-Wield's hand pairings, which Slots' both-hands table shows better: its multiplier says what it aims for, so the table sorts by it. One table shows how often what a modifier boosted won while it was in play; the other, for modifiers with a condition on the loadout, how often their targets showed without the boost, per run and as a share of all their showings, counting only the classes and slots the modifier applies to. Both count per objective, since a talisman or rule boost is active in both of its slots. Modifiers read as generated sentences from their conditions and targets, so a new row needs no wording.
- Hand pairs and Dual-Wield's same-class aim come from the database's classes alone: which hand is heavier can't be told, since it holds no weights.

## Reading the dump

- **`metrics.md` is the page's tables over the whole dump**, counted by the page's own code (`sim/report.ts` over `aggregate.ts`), every table in full, the Slots tables both by item and by region, and Furthest from fair; read it first, and query the CSV rows only for what it doesn't hold. A metric belongs in `aggregate.ts`, so the page and the file can't count it differently. It covers every allocation and class the dump ran: `--allocations STR --runs 10 --seed <the page's>` gives exactly the page's numbers; `--classes` plays only those classes, unlike the page's filter, so it changes the runs.
- **`vs-fair.csv` is every slot's regions with Vs fair**, for the classes together (`all`, as the page counts them) and for each class alone, from the same counting over the same runs. `fair_per_run` is the showings a run the region would get at its fair share: a line expecting only a few over the whole dump is noise, however far from 1.00 it reads.
- **`vs-fair.csv` also holds the time baseline**: `rollable_share` is the share a region would get if every option showed equally whenever it could roll, counted from every roll's pool, so it holds what Vs fair can't tell apart: when a region opens, boss and stat gates, which weapons an ash fits, gear that leaves reach and the rules that remove options. `vs_rollable` is the share against it, what odds, rules and catch-up make of it. The page leaves it out: it plays one stat allocation, where stat gates read plainly.
- A rolls row's `chance` is the chosen option's chance at roll time and `chosen_catch_up` the catch-up boost on what won, not the mean boost the tables show. An empty result has chance 0.
- `boosts` lists the modifiers above ×1 active on any option in the pool, `boost_chances` the summed chance of the options each hit, `chosen_boosts` those on what won.
- A talisman boost is active in both talisman slots, and `talisman_2` leaves out what `talisman_1` rolled, so count a synergy per objective, not per roll.
- An objective's stats and level are those it rolled with; a level gained for felling its boss shows on the next one.
- In `objectives.csv`, a blank slot is one the class doesn't roll; `(empty)` is a roll that found nothing.
- `chosen` is the item that rolled; `chosen_key` is what showings count by, so an alias's members share one key (`alias:any_staff`), and `none` is one key across every slot.
- `none_chance` is `none`'s chance in pools that hold it.
