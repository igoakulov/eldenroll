# Balance

Why the data rolls the way it does: every odds value other than 1 and every conditional rule, with its reason. Read it before tuning, and change the data and this file together: `pipeline/tests/test_balance.py` fails when a modifier row or an odds value other than 1 is missing here, or listed here but gone from the data.

- How modifier rows combine: `data/overrides/README.md#Selectors and modifiers`.
- Most values are provisional until tuned at the full-run simulation (`web/sim/README.md`); values off the tier table (`×70`, `×42`, `×34`, `×33`, `×6`, `×5`, `×4`, `×3.5`, `×3`, `×1.5`, `×0.5`) are deliberate placeholders for it.

## Levers

Three places decide how often anything rolls, and nothing else does:

- **Base odds**, per row, in `data/overrides/` (#Base odds).
- **Conditional rules**, the rows of `modifiers.csv` that multiply odds while a condition holds (#Conditional rules).
- **`web/src/engine/hyperparams.ts`**, for what applies to every row (#Hyperparameters). Each formula is written out there in full, over inputs the engine computes and passes in by name, such as an option's tally.

Every odds reason names what it serves, so preferences can be retuned while the baseline stays put. **Catch-up** is the baseline: what evens items out over a run (#Late arrivals). **Preference** is taste, and **Synergy** a pairing between items. An entry doing several labels each part, saying how much belongs to it where it can. An entry with no **Catch-up** label holds no baseline, and a conditional rule is a preference or a synergy unless it says otherwise.

Engine code holds no balance of its own: no weight, multiplier, cap or curve that changes a roll lives anywhere else, so every effect on a roll traces to one of the three while tuning. Owner, 2026-11-15.

## Late arrivals

What any catch-up must do, whatever its formula; #Hyperparameters holds today's. Each requirement came out of the full-run simulation, and every rewrite or retune of the engine is judged against all of them.

### Fair share

- **Every item a slot can roll shows about equally often over a whole run**, whether it comes into reach in the first region or the last, early or late, among few rivals or many. Base odds and rules then steer single items for taste; catch-up never stands in for them, and an item a rule removes stays removed.
- **In reach is decided at the roll.** An item counts from the moment it can roll: its region ticked or its boss felled, and its stats within `Max stat gap`. Stats reaching an item late are an arrival like a region opening. An item that leaves reach, by unticking or the Royal Capital after Maliketh, stops counting: the player knows what they leave behind.
- **Even out with memory.** Each item keeps a tally of the chance it has had, and a roll favours the items furthest behind the others that can roll now. A late arrival catches up and stops once level; an item that fell behind for any reason, luck included, is pushed again. A boost fixed when an item arrives and kept for the rest of the run can do neither: it floods its region long after the item is level, and never notices one that fell behind.
- **The tally is measured against the item's peers, never against the roll itself.** An item that earns a share only in rolls it can show in, and is then given exactly that share, is always level with what it earned: that memory plays the same as a fixed boost.
- **A synergy is never paid back.** The tally counts the chance an item would have had without rules, so a showing a rule boosted doesn't hold the item back later.
- **Who shares a tally follows what the player meets.** Spells and ashes are tallied across every class, since what varies for the player is which spells and ashes they meet over the whole run, whichever class shows them. The left hand and talismans are tallied per class, since their pools differ by class and a newcomer behind in every class's tally at once would show in objective after objective; the right hand is shared too, which closes more of its last regions' shortfall than per class. Within a shared tally an item is measured only against rolls that could show it: a sorcery never against what incantation rolls handed out.
- **Never fall back to plain odds.** When every option in a roll is level with or ahead of its peers, the roll still goes to the furthest behind; plain odds would feed the items in reach longest.
- **Variety over strict parity.** Items with high requirements in a secondary stat, one a build rarely raises beside its own (Intelligence for a melee weapon, Faith for a sorcery), may be pushed beyond even, so a run invites trying them. A high requirement in the item's primary stat earns no uplift: Strength or Dexterity for weapons, Strength for shields, Intelligence for sorceries, Faith for incantations, since a build's main stat often passes 60 by a run's end and opens nearly everything tied to it alone. Players habitually spread a melee build a little, which opens many weapons, and rarely spread a caster, which opens few spells. The uplift is set by base odds, item by item, each with its reason here (#Base odds), so it stays visible in the data.
- **Judged per stat allocation.** What a build can use decides what reaches it, so a fair share is read within one stat allocation of the simulation. A mix of builds makes an item only some builds reach look short in all of them, and averages away skews that run opposite ways in different builds.

### No forecast

The engine evens each roll against what can roll now, and never predicts what the rest of the run will bring. That is a limitation, kept on purpose:

- **An exact run-end share would need a forecast** of two things: every item the slot will hold by the run's end, and the chance the slot has left to hand out. Each item's target would be that chance spread over that count.
- **Region and boss gates could be forecast:** the player is assumed to play to the end, so every ticked region opens and every rollable boss falls.
- **Stat gates can't be:** which items a build reaches depends on levels not yet spent, and the build is the player's. A wrong list does worse than none: counting items the build never reaches reserves shares nobody claims, so the items in reach meet their targets early and stop being steered; leaving out items it will reach overfills the early ones. Ash pools follow the rolled weapon, and how often a slot rolls at all follows other rolls, such as spells needing a catalyst in hand, so neither can be forecast either. Only armor and talismans could be, and there catch-up reads nearly as even without one, so one rule serves every slot.
- **What it skews:**
  - **Early items get more than an even share.** Before later items arrive, they are all that can roll; catch-up stops serving them until the rest catch up, but never takes those showings back.
  - **Late arrivals fall short when few objectives remain.** Catch-up raises the lowest tallies first, so an item arriving late, by region or by stats, joins every item still behind at the bottom of the tally and shares the rolls left with them. The last region, opening with a handful of objectives left, can't reach its share at all, and a class that gets few objectives a run shows this most in its own slots.
  - **Items a build reaches late by stats lag.** A spell or weapon whose requirements a build reaches only late has less of the run to catch up in than the rest of its region.
- **To compensate, stat-dependent items are evened out by odds and rules** (#Base odds), read per stat allocation. This is baseline catch-up, apart from #Fair share's variety uplift. One value serves every build, so an item raised for a build that reaches it late runs over even in the build that raises its stat.

### Late-game crowding

- **The player sees items, not regions.** A new weapon and a new armor set from one region are two new things they'd like to roll, never a group; a slot showing several new items in a row is welcome variety. Crowding is the same item coming back soon in its slot.
- **Catching up must not make one item repeat.** A newcomer far behind its peers gets most of a slot's rolls until it catches up, and one that arrives with little of the run left would take most of the rest of it. Past a point, parity costs more than it gives: the same item in the same slot four objectives in a row, or five of the last ten, is too much, even for an item that is still owed. Any control acts per item and is judged by those runs of repeats, slot by slot, as the simulation's Too often column counts them.
- **No roll feels scheduled.** The most-favoured options hold a minority of a roll, and items level with their peers sit out without making the next pick predictable.

## Tiers

A modifier multiplies an option's odds. Pick its value from these tiers, or `0` to remove the option:

| Tier | × | Feels like |
|---|---:|---|
| `prefer` | 2 | a nudge |
| `strong` | 10 | clearly more likely |
| `boost` | 100 | likely, but other options still show up |
| `guarantee` | 10,000 | near-certain in a small pool |
| `top` | 1,000,000 | near-certain in any pool |

**Each ×10 adds about one more 9, never 100%.** One boosted option among others at odds 1 wins this often:

| × | In a pool of 10 | In a pool of 100 |
|---:|---:|---:|
| 10 | 53% | 9% |
| 100 | 92% | 50% |
| 1,000 | 99.1% | 91% |
| 10,000 | 99.9% | 99% |
| 1,000,000 | 99.999% | 99.99% |

So the same multiplier feels weaker in a bigger pool, which is why `guarantee` is for small pools and `top` for large ones. A pool with fixed shares counts as larger (#Fixed shares). Catch-up only moves chance between the options (#Hyperparameters), so a boosted option faces about the sum of the pool's odds whatever the tallies say, and the tiers are sized to that: every `guarantee` row wins 98–99% even in the whole armor pool, where its targets are a few sets among about 180, and an exultation at odds 0.25 among the talismans. One order lower would leave the exultations and the jump sets under 90% (owner, 2026-11-17: as low as that allows). Nothing short of removing every other option makes a roll certain, and a reroll can always show something else.

When two boosted options meet in one pool, compare them with each other, not with the pool:

- **Keep tiers two orders of magnitude apart.** A `top` (×1,000,000) next to a `guarantee` (×10,000) still wins 99% of the time; two tiers only ×10 apart would split about 90/10.
- **Avoid two `top` targets in one pool:** they split about 50/50. It is allowed where the combination is rare, such as `Claw Talisman` with `Axe Talisman`; `import-report.json` lists every pool where it can happen.
- **Soft rows and catch-up compound on top.** A `prefer` or `strong` row on a rival raises the rival, and so does catch-up on a rival behind its peers; the simulation's Synergies tab shows how often each boosted target still wins.
- **Off-tier values** (`×70`, `×42`, `×34`, `×33`, `×6`, `×5`, `×4`, `×3.5`, `×3`, `×1.5`, `×0.5`) are aimed at a target share rather than a feel, such as Dual-Wield's share of same-class pairs, and are tuned at the simulation.
- **When two boosted targets clash, the rarer trigger wins.** The run should vary, and the more common trigger gets more chances to show its synergy on other objectives. A rule that would contradict the card, such as `No armor` beside a boosted set, is removed by the rarer trigger, since rules roll before armor.

## Paired slots

The two talisman slots roll as one draw, and so do the two combat rule slots: every pair of options weighs its two options' weights times the rows that link them, so a pairing holds whichever slot either option would land in, and the pair shows in its slots in either order. A row whose condition names a slot of the pair reads the other slot of the pair, both ways, and applies once to a pair: one row links two talismans, and one exclusion keeps two rules apart. Owner, 2026-11-19.

- **Reading a pair row:** its value multiplies the pair, as a single-slot row multiplies one option. Two options at weights `a` and `b` with a ×N row between them weigh `N·a·b`, against `a·c` for any other pair holding `a`.
- **A slot that rolls alone,** such as a reroll that keeps the first slot, reads the kept one through the same rows.

## Fixed shares

`None`, the consumables and the `Naked Set` hold a fixed share of their roll, whatever else is in it: they are always there, so the room they leave, an empty slot or a consumable in the item slot, shouldn't shrink as the pool grows or vary with a class's exclusions. Owner, 2026-11-19.

- **Which options:** every option with no location, the same line catch-up draws (#Hyperparameters): the `none` item, consumables and the `Naked Set`, whose pieces have no location. In the combat rule slots, where no rule has a location, `None` alone.
- **How their odds count:** against the rest of the pool counted as 100 odds, whatever its size. `None` at 100 holds half the roll; two fixed options at 80 and 20 hold 80 / 200 and 20 / 200. Among themselves, with nothing else in the pool, they share by their odds.
- **Repeats:** an empty slot may follow another, so one `None` serves both rule slots; the two slots roll as one draw (#Paired slots), and a row on the pair sets how often both are empty.
- **Modifiers work in two steps.** A ×N row multiplies an option's odds against everything else in the roll, the fixed shares included, so first find the option's chance in the roll: its share of the rest of the pool times what the fixed shares leave. Then ×N takes a chance `p` to `N·p / (1 + (N−1)·p)`. A fixed share `s` makes the pool count as `1 / (1 − s)` times its size: with `None` at half, `Parry only` holding 4% of the rules has 2% of the roll, and ×10 takes it to about 17%. A guarantee or top tier still beats a fixed share nearly always.
- **A row aimed at a fixed option** multiplies its odds the same way: Jester's `none` at 33 holds a quarter of its right hand, and `No armor` makes the `Naked Set` top tier.

## Hyperparameters

`web/src/engine/hyperparams.ts` holds the balance values that apply to every row, and is where they are tuned against the simulation; the engine takes them as an argument, so a run can override them.

- **`catchUp`** evens out how often items show over a whole run (#Late arrivals). With every option at its odds, an item in reach from Limgrave gets every objective of the run while a Haligtree one gets the last tenth, so early regions would take most of the rolls. Modifiers apply on top, so a synergy keeps its full strength; rules and bosses don't get it.
  - **The tally:** the run keeps, for every item and set with a location, the chance it has had in the objectives done, rules left out, so a synergy's extra showings are never paid back. Only rolls the player keeps count: a reroll or a discarded objective adds nothing. So a rule above ×1 never moves a tally: `Dual-Wield Warrior`'s same-class rows change which left-hand weapon shows, not what any tally holds, and never touch the right hand's that every class shares. `perCharacterClass` names the slots whose tally each class keeps apart, the left hand and talismans; every other slot's is shared by every class. A second talisman or ash counts with the first. The weapon shortlist's rolls are evened among the listed weapons in the same right-hand tally, so they rotate evenly, and turning the shortlist off leaves them ahead of their peers for a while (owner, 2026-11-17: kept simple).
  - **`even`** raises the lowest tallies among the options with a location that can roll now, per unit of base odds, to one common level with the roll's chance: whoever is furthest behind its peers gets the most, and whoever is above the level sits the roll out. A late arrival starts at 0 and catches up; an item behind for any reason, luck included, is pushed again. Those options hold their base share of the pool between them, so `none`, consumables and anything else found everywhere keep theirs, which would otherwise fade as late items catch up.
  - **`boosted`**: an option with a rule above ×1 active on it is weighed at least at its base odds, so a synergy or guarantee holds on an option ahead of its peers.

  Owner, 2026-11-17: this catch-up, with no pace limit, chosen on the simulation per stat allocation; the right hand shared by every class.

- **`fixedShare`** sets the weight of the rest of the pool against the fixed shares' odds (#Fixed shares): 100, so odds 100 is half the roll.

- **`defaultMaxStatGap`** is how far above the player's stats an item may be. It is per item, never a shared budget, so a loadout of several near-reach items is fine.

## Base odds

A row's own odds, for every option that rolls differently all the time. Files: `character_classes.csv`, `combat_rules.csv`, `item_odds.csv`, `boss_odds.csv`, `armor_set_odds.csv` in `data/overrides/`.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| class | `ranger` | 0.5 | a less enjoyable playstyle, with less weapon variety than melee or magic |
| class | `jester` | 0.25 | a mix of silly, quirky and hard ways to fell a boss, which grows annoying when it rolls often |
| rule | `none` | 100 | half of each rule slot taken alone, a fixed share (#Fixed shares); a pair of `None` and a rule weighs more (#36. Empty rule slots). Owner, 2026-11-14: about 20% of objectives with no rule, 59% with one and 21% with two; owner, 2026-11-19: one implementation for every empty slot, giving 20%, 60% and 20% for every class before synergies |
| rule | `do_not_get_hit` `no_healing_flasks` `no_armor` `no_rolling` `overloaded` | 0.5 | owner decision: the full-run simulation (`web/sim/README.md`) showed these five crowding out other rules and, for `no_armor`, pushing the `Naked Set` and the Blue Dancer Charm's light sets past their guarantee's reach of each other |
| rule | `parry_only` `l2_only` | 0.5 | owner decision: both limit the moveset a lot, `L2 only` sometimes clashing with an ash it doesn't suit, so each joins the other hard rules at about 5% |
| rule | `drink_deflecting_hardtear` `drink_crimson_sapping_cracked_tear` `drink_bloodsucking_cracked_tear` | 0 | these tears come only from DLC bosses, and rules have no location filter, so they could ask for something out of reach; owner decision: they stay off |
| item | `grafted_dragon` | 3 | `Jester`'s signature right hand; it rolls nowhere else (#29. Grafted Dragon only on Jester) |
| item | `perfumed_oil_of_ranah` `ancestral_infants_head` `omen_bairn` `regal_omen_bairn` `horned_bairn` | 3 | owner decision. **Catch-up:** `Wraith Calling Bell`, reachable from Liurnia while the other tools wait for a later region or boss, ran far ahead of them, so it rolls at a third of their odds. The tools share what the consumables leave of the item slot (#Fixed shares), and keep the region filter while consumables don't, so no tool rolls in the Limgrave region until a boss is felled |
| item | `academy_magic_pot` `acid_spraymist` `albinauric_pot` `alluring_pot` `ancient_dragonbolt_pot` `beastlure_pot` `bloodboil_aromatic` `cursed_blood_pot` `eternal_sleep_pot` `fetid_pot` `fire_pot` `freezing_pot` `frenzied_flame_pot` `giantsflame_fire_pot` `hefty_fetid_pot` `hefty_fire_pot` `hefty_fly_pot` `hefty_freezing_pot` `hefty_frenzied_flame_pot` `hefty_furnace_pot` `hefty_lightning_pot` `hefty_magic_pot` `hefty_oil_pot` `hefty_poison_pot` `hefty_rancor_pot` `hefty_red_lightning_pot` `hefty_rock_pot` `hefty_rot_pot` `hefty_volcano_pot` `holy_water_pot` `ironjar_aromatic` `lightning_pot` `magic_pot` `oil_pot` `poison_pot` `poison_spraymist` `rancor_pot` `red_lightning_pot` `redmane_fire_pot` `roped_fetid_pot` `roped_fire_pot` `roped_fly_pot` `roped_frenzied_flame_pot` `roped_holy_water_pot` `roped_lightning_pot` `roped_magic_pot` `roped_oil_pot` `roped_poison_pot` `roped_volcano_pot` `rot_pot` `sacred_order_pot` `sleep_pot` `spark_aromatic` `swarm_pot` `uplifting_aromatic` `volcano_pot` | 3 | owner decision: consumables hold about two thirds of the item slot whenever a tool is in reach, a fixed share (#Fixed shares); today's average over a run, steady instead of all of it in Limgrave and under a third late. The other throwables stay at 1, a third of a pot's or perfume's odds and together about an eighth of the consumables, since the full-run simulation showed them taking the item slot too often |
| item | `igons_drake_hunt` | 0 | easily missed in the game; `Igon's Greatbow` itself keeps normal odds |
| item | `lamenters_mask` `rock_heart` `priestess_heart` | 0 | transforms that conflict with gear, so an objective can't use one with its loadout |
| item | `litany_of_proper_death` | 0 | its places are hard to pin down, and it is nearly useless against anything not undead |
| item | `finger_seal` `godslayers_seal` `giants_seal` `gravel_stone_seal` `clawmark_seal` `golden_order_seal` `erdtree_seal` `dragon_communion_seal` `frenzied_flame_seal` `dryleaf_seal` `fire_knights_seal` `spiraltree_seal` | 2 | a rolled catalyst decides `Spellblade`'s spell type, so staves and seals should hold the ratio of sorceries to incantations, owner 2026-11-16; with fewer seals than staves, seals at twice the odds do |
| item | `ants_skull_plate` `antspur_rapier` `coil_shield` `deadly_poison_perfume_bottle` `poisoned_hand` `poleblade_of_the_bud` `rotten_battle_hammer` `rotten_crystal_spear` `rotten_crystal_staff` `rotten_crystal_sword` `rotten_greataxe` `rotten_staff` `scorpions_stinger` `serpent_bow` `serpentbone_blade` `tooth_whip` `venomous_fang` | 2 | owner decision: rot and poison weapons, shields and staves (the weapons that boost `Kindred of Rot's Exultation`, #24. Rot and poison) are underrepresented, at about 3% of what a hand can roll, and a status synergy with the talisman |
| item | `carian_thrusting_shield` `dueling_shield` `ritual_thrusting_shield` | 3 | owner decision: thrusting shields play distinctly, and are underrepresented at about 1–2% of the right hand's showings for `Knight` and `2H Warrior`, the only classes that roll them |
| item | `caestus` `cipher_pata` `clinging_bone` `hookclaws` `reverse_bladed_sword` `star_fist` `veterans_prosthesis` | 2 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `iron_ball` `ornamental_straight_sword` | 1.7 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `bloodhound_claws` `raptor_talons` | 1.4 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `falx` `greatsword_of_radahn_light` `greatsword_of_radahn_lord` `thiolliers_hidden_needle` | 0.35 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `madding_hand` | 0.3 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `backhand_blade` `beast_claw` `claws_of_night` `curseblades_cirque` `dancing_blade_of_ranah` `death_knights_twin_axes` `golem_fist` `horned_warriors_sword` `katar` `pata` `red_bears_claw` `rellanas_twin_blades` `smithscript_cirque` `smithscript_dagger` `spiked_caestus` `starscourge_greatsword` | 0.2 | owner decision. **Catch-up:** set by the region where each first comes into reach: raised where few arrive early and they showed too rarely, lowered where many arrive late and catch-up made them spike. **Preference:** paired weapons leave `Dual-Wield Warrior`'s left hand empty (#26. Dual-Wield Warrior pairs), and the class holds about 20% paired through a run at every completion |
| item | `reed_great_katana` | 7 | owner decision: great katanas are a rare weapon class, mostly found in the DLC; raised to about 3 showings a run over the melee classes, from about 0.4 at odds 1 |
| item | `milady` | 5 | owner decision: light greatswords are a rare weapon class, mostly found in the DLC; raised to about 2 showings a run over the melee classes, from about 0.5 at odds 1 |
| item | `danes_footwork` | 1.4 | owner decision. **Catch-up:** its region's odds for paired weapons (#26. Dual-Wield Warrior pairs). **Preference:** four times those, since hand-to-hand weapons were underrepresented |
| item | `dryleaf_arts` | 0.8 | owner decision. **Catch-up:** its region's odds for paired weapons (#26. Dual-Wield Warrior pairs). **Preference:** four times those, since hand-to-hand weapons were underrepresented |
| item | `hoarah_louxs_earthshaker` | 2 | owner decision: a cool, rare boss ash |
| item | `agheels_flame` `aspects_of_the_crucible_horns` `aspects_of_the_crucible_tail` `black_flame` `catch_flame` `dragonclaw` `dragonfire` `dragonmaw` `flame_sling` `lightning_strike` `poison_mist` `the_flame_of_frenzy` | 0.9 | owner decision. **Catch-up:** incantations by the region where they first come into reach, here Limgrave. Limgrave through Altus take every `Pyromancer` roll while little else is in reach, so their lead over later regions can't shrink, but odds move it among them; this holds Limgrave level once Liurnia comes down, and lower odds push Caelid, Altus and Leyndell over even |
| item | `bloodboon` `frenzied_burst` `frozen_lightning_spear` `honed_bolt` `howl_of_shabriri` `lightning_spear` `o_flame` `smarags_glintstone_breath` `surge_o_flame` `swarm_of_flies` | 0.8 | owner decision. **Catch-up:** incantations by the region where they first come into reach, here Liurnia, which read high in both the Even and Faith builds, as Limgrave's row explains |
| item | `fires_deadly_sin` `inescapable_frenzy` `radagons_rings_of_light` | 1.5 | owner decision. **Catch-up:** incantations by the region where they first come into reach, here Leyndell, so `Pyromancer`'s incantations read closer to even in the Even and Faith builds, where early regions otherwise keep a lead and late ones fall short (#No forecast). Regions, not single spells, so the odds stay few and easy to revise. Leyndell sits below the regions after it: at 2 its spells ran well over even at completion 50. Sorceries have no region odds: `Sorcerer` already reads near even |
| item | `ancient_dragons_lightning_spear` `ancient_dragons_lightning_strike` `black_flame_ritual` `borealiss_mist` `burn_o_flame` `electrocharge` `flame_fall_upon_them` `giantsflame_take_thee` `golden_arcs` `knights_lightning_spear` `multilayered_ring_of_light` `placidusaxs_ruin` `theodorixs_magma` `unendurable_frenzy` `watchful_spirit` | 2 | owner decision. **Catch-up:** incantations by the region where they first come into reach, as above; the Mountaintops through Gravesite Plain |
| item | `aspects_of_the_crucible_bloom` `aspects_of_the_crucible_thorns` `bayles_flame_lightning` `bayles_tyranny` `divine_beast_tornado` `divine_bird_feathers` `fire_serpent` `giant_golden_arc` `land_of_shadow` `messmers_orb` `pest_thread_spears` `rain_of_fire` `rotten_butterflies` `wrath_from_afar` | 3 | owner decision. **Catch-up:** incantations by the region where they first come into reach, as above; Shadow Keep through Jagged Peak arrive with few objectives left and many rivals |
| item | `furious_blade_of_ansbach` `light_of_miquella` `spira` | 6 | owner decision. **Catch-up:** incantations by the region where they first come into reach, as above; Enir-Ilim is the last region, with the fewest objectives left, and higher odds no longer help |
| item | `blades_of_stone` `flame_of_the_fell_god` `lansseaxs_glaive` `rings_of_spectral_light` `lorettas_mastery` | 2 | owner decision. **Catch-up:** the Even build reaches this spell late for its stat requirement, so it is raised until it shows about evenly there (#No forecast). **Preference:** worth seeing, so it is left running over even in the build that raises that stat |
| item | `death_lightning` `fortissaxs_lightning_spear` | 2 | owner decision. **Catch-up:** the Even build reaches this spell late for its Faith requirement, so it is raised part of the way there (#No forecast); enough to read even under Even would run it about three times over even under Faith. **Preference:** worth seeing |
| item | `black_blade` | 4 | owner decision. **Catch-up:** the Even build reaches this spell late for its stat requirement, so it is raised until it shows about evenly there (#No forecast). **Preference:** worth seeing, so it is left running over even in the build that raises that stat |
| item | `ghostflame_breath` | 4 | owner decision. **Catch-up:** its region's odds of 3. **Preference:** the rest, for a spell worth seeing that still showed too rarely |
| item | `midras_flame_of_frenzy` `triple_rings_of_light` `scarlet_aeonia` | 5 | owner decision. **Catch-up:** its region's odds of 3. **Preference:** the rest, for a spell worth seeing that still showed too rarely |
| item | `roar_of_rugalea` | 3 | owner decision. **Catch-up:** its region's odds of 2. **Preference:** the rest, for a spell worth seeing that still showed too rarely |
| item | `lord_of_bloods_exultation` `kindred_of_rots_exultation` `blue_dancer_charm` | 0.25 | owner decision: the full-run simulation showed each turning up without its synergy (a bleed or rot weapon, a light build) often enough to read as noise rather than a deliberate pairing |
| item | `radagons_soreseal` `marikas_soreseal` `radagons_scarseal` `marikas_scarseal` `crucible_scale_talisman` `crucible_feather_talisman` `crucible_knot_talisman` `fine_crucible_feather_talisman` `talisman_of_all_crucibles` `shabriris_woe` | 0.5 | owner decision: `Any Scarseal / Soreseal`, `Any Crucible talisman` and `Shabriri's Woe` only raise the damage taken, for little or no utility, unlike `Any Scorpion Charm`, which also steers toward an elemental build |
| item | `warrior_jar_shard` | 0 | owner decision: it would otherwise take the talisman slot that `Shard of Alexander`, the more useful of the two, should get |
| boss | `guardian_golem_highroad_cave` `ancient_hero_of_zamor_weeping_peninsula_tombsward_weeping_evergaol_tombsward_cave_entrance` | 10 | each takes about 20% of its region's boss roll, counting the region's other bosses, so what it drops comes early: `Blue Dancer Charm`, `Kindred of Rot's Exultation`, the `Dancer's Set` and `Godskin Swaddling Cloth` for their synergies, `Radagon's Scarseal` and `Crucible Knot Talisman` for talisman variety. `Esgar, Priest of Blood` and the Lake of Rot's `Dragonkin Soldier`, by the `Mushroom Crown`, are in regions of 5 bosses and get 20% at odds 1 |
| boss | `kindred_of_rot_seethewater_cave` | 9 | about 20% of its region's boss roll, as above |
| boss | `dancer_of_ranah_cerulean_coast_southern_nameless_mausoleum_far_southwest_coast` `omenkiller_liurnia_of_the_lakes_west_albinauric_village` | 7 | about 20% of its region's boss roll, as above |
| boss | `spiritcaller_snail_spiritcaller_cave` | 2.5 | about 20% of its region's boss roll, as above |
| boss | `blaidd_the_half_wolf_liurnia_of_the_lakes_rannis_rise_seluviss_rise` | 0 | an invader, not a boss fight; kept for `Royal Greatsword` and his armor |
| boss | `fire_knight_kood_specimen_storehouse_shadow_tower` | 0 | kept for `Flame Spear` and `Winged Serpent Helm` |
| boss | `fire_knight_salza_shadow_keep_west_rampart` | 0 | kept for `Rain of Fire` and `Salza's Hood` |
| boss | `fire_knight_wego_shadow_keep_drained_church_district` | 0 | kept for `Death Mask Helm` |
| boss | `divine_bird_warrior_belurat_tower_settlement_swamp` | 0 | kept for `Horned Warrior's Sword` |
| boss | `divine_bird_warrior_enir_ilim` | 0 | kept for `Horned Warrior's Greatsword` |
| boss | `ensha_of_the_royal_remains_roundtable_hold` | 0 | kept for `Clinging Bone` |
| boss | `erdtree_avatar_deeproot_depths` | 0 | kept for `Staff of the Avatar` |
| boss | `fire_prelate_mt_gelmir_fort_laiedd` | 0 | kept for `Prelate's Inferno Crozier` |
| boss | `putrid_avatar_miquellas_haligtree_elphael` | 0 | kept for `Rotten Staff` |
| boss | `shadow_tree_spirit_gravesite_plain_ellac_river_cave` | 0 | kept for `Horned Bairn` |

A boss at 0 is never an objective, and its items roll by region as a regular enemy's would. `armor_set_odds.csv` has no rows yet.

## Conditional rules

Every row of `data/overrides/modifiers.csv` belongs to one rule below. A rule always has a condition; what holds all the time is base odds. When an exception between two items turns up, add it here by priority, then as rows, instead of changing the schema. Rule numbers are stable.

### Priority

| Tier | Meaning | Built |
|---|---|---|
| P1 | without it an objective is impossible, or a slot breaks | required |
| P2 | a synergy worth seeing | required, tuned at the simulation |
| P3 | long tail: a rare pair the player can reroll | only if play shows it matters |
| Idea | not defined well enough to score | needs a decision first |

Four questions decide a tier: what happens when the rule is missing (an impossible objective, a weak synergy, or nothing noticed); how often its items roll together; whether a class stops working without it; and whether it serves a class or synergy the game is meant to feature.

### Classes with extra rules

Most classes are just their pools in `slot_pools.csv`. Some have rules on top:

- **Dual-Wield Warrior:** same-class pairs and paired weapons (#26. Dual-Wield Warrior pairs), and `Grafted Dragon` kept out (#29. Grafted Dragon only on Jester).
- **Jester:** its right hand's balance (#19. Jester's right hand), `Grafted Dragon` as its own, and odd pairs, such as `Spinning Weapon` on a staff, left alone on purpose: they are the point of the class. Its pool holds `none`, 6 offensive greatshields, torches, perfume bottles, one staff and `Grafted Dragon`; none of the greatshields is reachable in the Limgrave region, which is accepted because `Jester` rolls about once per run there.
- **Knight:** the thrusting shield (#10. Knight's thrusting shield) and no paired weapons (#28. No paired weapons in unpaired classes).
- **Sorcerer and Pyromancer:** never `L2 only` (#6. L2 only needs a skill), and their left hand's mix of catalysts and shields (#32. Caster left hand). `Sorcerer` also rolls a left-hand ash, for the riposte talismans (#37. Ripostes).
- **Knight and both Warriors** never roll `Carian Sorcery Sword`, which `Sorcerer` rolls in its right hand (#35. Carian Sorcery Sword).
- **Sorcerer, Pyromancer, Ranger and Jester** lose the talismans and rules they can't use (#33. Talismans a class can't use, #34. Attack rules a class can't use).

### 1. Parry only needs a parry ash

P1. The rule can't be obeyed without one.

Rows: `parry_only_needs_a_parry_ash`

### 2. Charged attacks need a weapon in the right hand

P1. `Charged R2 only` needs a melee weapon, thrusting shield, torch or perfume bottle in RH; `Drink Stonebarb Cracked Tear` one of those or a bow. Casters and `Jester` would hit an impossible objective often.

Rows: `charged_r2_needs_a_melee_weapon_in_rh`, `stonebarb_needs_a_weapon_in_rh`

### 3. Melee rules need a melee weapon

P1. `Jump attacks only`, `Rolling / crouch attacks only` and `Land a riposte` need a melee weapon, thrusting shield, torch or perfume bottle in a hand; `Sorcerer` and `Pyromancer` would hit it on every roll. `No ripostes` needs one too, since without one it asks nothing.

Rows: `melee_rules_need_a_melee_weapon_in_a_hand`

### 5. Rule exclusions

P1. Two rules never roll together when they contradict, when one is a harder version of the other, or when one makes the other meaningless. A pair that is only hard stays: `No healing flasks` with `Overloaded`, since a boss can die fast and spells, attacks and items can heal. A practically impossible pair goes: `Do not get hit` with `Overloaded`, where the player can only walk. Each pair is written both ways.

- `Do not get hit` excludes `No healing flasks` and `Gesture after every flask` (nothing to heal) and `Drink Ruptured Crystal Tear` (its explosion damages the drinker).
- `Jump attacks only` stays free with `R1 only`, `R2 only` and `L1 only`, because a jump attack can use each.
- `Rolling / crouch attacks only` is a harder `R1 only`, because those attacks are R1.
- Every attack rule but `R1 only` already rules out a riposte, an R1 input, so `No ripostes` adds nothing to them and `Land a riposte` can't be obeyed with them.
- The rolling and load rules (`No rolling`, `Heavy rolling`, `Overloaded`, `No armor`, `No talismans`) exclude each other where one contradicts or is a harder version of another.
- `Apply status` excludes `Parry only`: applying a status with parries and ripostes alone is close to impossible.
- The two tears that roll exclude each other: tears are mutually exclusive.

Rows: `do_not_get_hit_excludes`, `apply_status_excludes`, `land_a_riposte_excludes`, `dodge_excludes`, `gesture_after_every_flask_excludes`, `r1_only_excludes`, `r2_only_excludes`, `charged_r2_only_excludes`, `l1_only_excludes`, `l2_only_excludes`, `jump_attacks_only_excludes`, `rolling_crouch_attacks_only_excludes`, `parry_only_excludes`, `no_ripostes_excludes`, `no_healing_flasks_excludes`, `no_armor_excludes`, `no_talismans_excludes`, `no_rolling_excludes`, `heavy_rolling_excludes`, `overloaded_excludes`, `drink_stonebarb_cracked_tear_excludes`, `drink_ruptured_crystal_tear_excludes`

### 6. L2 only needs a skill

P1. An empty hand has no skill. `Sorcerer` and `Pyromancer` could use a shield's, but they kill bosses with spells.

Rows: `l2_only_not_on_pure_casters`, `l2_only_needs_a_skill_not_empty`

### 10. Knight's thrusting shield

P1. A thrusting shield is the Knight's shield, so with one in RH the left hand rolls `none`; any other RH keeps a shield in LH. The second row also removes the `none` in Knight's one-option spell pool, which then shows `none` as an empty result, so nothing changes on screen.

Rows: `knight_thrusting_shield_empties_lh`, `knight_other_rh_keeps_a_shield_in_lh`

### 11. Blue Dancer Charm needs light hands

P1. The charm boosts physical damage at a low equip load, and the hands roll first. So a heavy weapon class, staff, seal, thrusting shield or greatshield in RH removes it; with both hands full, RH must be a dagger, straight sword, curved sword, thrusting sword or whip, and LH one of those, a small or medium shield, a staff or a seal. The rows read the hands and name no class, so a class's chance of the charm follows from what it can hold: never `Sorcerer` or `Pyromancer`, always open on an empty `Jester` RH.

Rows: `heavy_rh_removes_blue_dancer_charm`, `two_hands_need_a_lightest_rh_for_blue_dancer_charm`, `two_hands_need_a_light_lh_for_blue_dancer_charm`

### 12. Blue Dancer Charm and the light sets

P2. A named class idea: the charm wants a light load, so the 9 light sets (`guarantee`) and `No armor` (`strong`) follow it. Owner, 2026-11-13: final, since the simulation shows the sets winning every roll the charm is in.

Rows: `blue_dancer_charm_boosts_light_sets`, `blue_dancer_charm_boosts_no_armor`

### 13. Claw Talisman and jump attacks

P2. The talisman boosts jump attacks, so `Jump attacks only` goes top tier, and the rule brings the jump sets (#23. Jump attacks and the jump sets). The talisman doesn't boost the sets itself: that would double-dip, and where the rule can't roll, such as for a caster, the sets don't suit the loadout.

Rows: `claw_talisman_makes_jump_attacks_top`

### 14. Shards and L2 only

P2. `Shard of Alexander` and `Warrior Jar Shard` boost skills, so `L2 only` goes top tier.

Rows: `shards_make_l2_only_top`

### 15. Axe Talisman and charged attacks

P2. The talisman boosts charged attacks, so `Charged R2 only` and `Drink Stonebarb Cracked Tear` go top tier.

Rows: `axe_talisman_makes_charged_rules_top`

### 17. Dancer's weapons

P2. Eight weapons suit the Dancer's moveset: `Curseblade's Cirque`, `Dancing Blade of Ranah`, `Eleonora's Poleblade`, `Flowing Curved Sword`, `Giant's Red Braid`, `Hand of Malenia`, `Marais Executioner's Sword`, `Regalia of Eochaid`. One in a hand makes the `Dancer's Set` top tier, and `Shard of Alexander`, `Warrior Jar Shard` and `Axe Talisman` next. The set beats every other boosted set: it comes late, from a DLC boss, when the others have had their turns. So the weapon removes `No armor`, whose `Naked Set` would otherwise split the armor roll with it and contradict the card.

Rows: `dancers_weapon_makes_dancers_set_top`, `dancers_weapon_boosts_moveset_talismans`, `dancers_weapon_removes_no_armor`

### 18. Parry ashes

P2. A parry ash in a hand boosts `Parry only` (`strong`), and `Dagger Talisman` and `Blade of Mercy` (`boost`), whose critical hits a parry sets up: with the two talisman slots, one of them shows about 90% of the time, the rest going mostly to the `guarantee` synergies that take a slot first (owner, 2026-11-19).

Rows: `parry_ash_boosts_parry_talismans`, `parry_ash_boosts_parry_only`

### 19. Jester's right hand

P2. Shapes the class: an empty right hand is part of the joke, so `none` goes to odds `33`, a quarter of the hand at every point of a run (#Fixed shares), the staff `×2` and torches `×0.5`, with `Grafted Dragon` at base odds 3. The aims are `none` about a quarter of the hand, and torches about 30% in the Limgrave region, where they get `×3.5` more while the boss is there. Values preliminary, read at the simulation once the rest is settled.

Rows: `jester_none_x33`, `jester_staff_x2`, `jester_torches_x0_5`, `jester_torches_in_limgrave`

### 22. Buff ashes on weapons that refuse them

P3, built on the owner's ruling. `Golem Fist`, `Lizard Greatsword`, `Smithscript Axe`, `Smithscript Greathammer`, `Smithscript Spear` and `Smithscript Dagger` can't take an ash that buffs the weapon (Fextralife). One in a hand removes those ashes. The target can't name a slot, so the other hand loses them too; that costs little.

Rows: `buff_ash_weapon_removes_buff_ashes`

### 23. Jump attacks and the jump sets

P2. The `Gravebird` and `Raptor's` chests boost jump attacks, so they suit `Jump attacks only`, which `Claw Talisman` brings (#13. Claw Talisman and jump attacks). The rule is rarer than `Kindred of Rot's Exultation`, so the rule removes the `Mushroom Crown` sets, which would otherwise win the armor roll with 5 sets against 2.

Rows: `jump_attacks_rule_boosts_jump_sets`, `jump_attacks_rule_removes_mushroom_sets`

### 24. Rot and poison

P2. A rot or poison weapon, shield or ash in a hand makes `Kindred of Rot's Exultation` near-certain (`guarantee`), and the talisman puts the 5 `Mushroom Crown` sets in the guarantee tier, because the crown matters for rot and poison loadouts. The chain goes weapon to talisman to set, never weapon to set, so nothing double-dips, and the three come together. The triggers are the owner's list in the rows. The `Mushroom Crown` sets beat the `Blue Dancer Charm` light sets, so the talisman and the charm never show together. `No armor` and the jump sets win over them (#Tiers, #23. Jump attacks and the jump sets).

Rows: `rot_boosts_kindred_exultation`, `kindred_exultation_boosts_mushroom_sets`, `kindred_exultation_removes_blue_dancer_charm`

### 25. Blasphemous Blade and Prayerful Strike

P2. Their L2 heals a lot, so the loadout lives by L2: `No healing flasks` and `Overloaded` become playable and are boosted `×5`, and the rules that forbid L2 are removed.

Rows: `blasphemous_blade_boosts_healing_rules`, `prayerful_strike_boosts_healing_rules`, `blasphemous_blade_needs_l2`, `prayerful_strike_needs_l2`

### 26. Dual-Wield Warrior pairs

P2. The class's identity, as odds rather than a filter. Once RH has rolled, LH weapons of RH's class get `×70` against other classes only; RH's own odds never drop, so scarce paired classes keep theirs, and a weapon with no reachable partner simply pairs with another class, so there is no re-roll or fallback. A paired weapon in RH, by class or by name, leaves LH `none`; any other RH keeps a real, unpaired LH. Size mismatches, such as a dagger with a colossal weapon, are accepted. The aim is a ballpark, owner 2026-11-17: about 65% same-class pairs, 20% a paired weapon with LH `none` and 15% two classes, over a whole run and in each region. `×70` sets the split between same-class pairs and two classes; the paired share is set by the paired weapons' own odds (#Base odds), by the region where each arrives, since a boost on every paired weapon lifts every region alike and can't undo catch-up crowding the DLC's many late ones in. Rot and poison paired weapons keep their own odds.

A light weapon in RH (`dagger`, `straight_sword`, `curved_sword`, `thrusting_sword`, `whip`) removes every heavy class from LH outright, by `×0`: owner decision, confirmed once against the simulation and never tracked again, since a `×0` exclusion guarantees the outcome. The classes the game itself calls paired (`fist`, `claw`, `beast_claw`, `hand_to_hand`, `backhand_blade`, `throwing_blade`, drawing a second copy on two-handing) and the named weapons that share that trait despite an ordinary class (every weapon at `str_bonus_2h = false` in `str_bonus_2h.csv` but for `Grafted Dragon` and `Starscourge Greatsword`, which keep the bonus) leave LH `none`.

Rows: `warrior_dw_pairs_greatsword`, `warrior_dw_pairs_straight_sword`, `warrior_dw_pairs_colossal_weapon`, `warrior_dw_pairs_spear`, `warrior_dw_pairs_dagger`, `warrior_dw_pairs_halberd`, `warrior_dw_pairs_curved_sword`, `warrior_dw_pairs_axe`, `warrior_dw_pairs_hammer`, `warrior_dw_pairs_great_hammer`, `warrior_dw_pairs_greataxe`, `warrior_dw_pairs_colossal_sword`, `warrior_dw_pairs_curved_greatsword`, `warrior_dw_pairs_katana`, `warrior_dw_pairs_great_spear`, `warrior_dw_pairs_thrusting_sword`, `warrior_dw_pairs_twinblade`, `warrior_dw_pairs_flail`, `warrior_dw_pairs_whip`, `warrior_dw_pairs_heavy_thrusting_sword`, `warrior_dw_pairs_reaper`, `warrior_dw_pairs_great_katana`, `warrior_dw_pairs_light_greatsword`, `warrior_dw_paired_class_empties_lh`, `warrior_dw_paired_weapon_empties_lh`, `warrior_dw_unpaired_rh_keeps_lh_unpaired`, `warrior_dw_light_rh_removes_heavy_lh`

### 27. Bleed

P2. The bleed counterpart of #24. Rot and poison: a bleed weapon, shield or ash in a hand makes `Lord of Blood's Exultation` near-certain, at the same tier as rot, and the talisman boosts the 11 `White Mask` sets (`strong`). Bleed items are far more common than rot ones, so the sets get much less than the `Mushroom Crown` sets do, or the mask would show on too many objectives: the aim is the mask on 33–50% of objectives with the talisman. The triggers are Fextralife's Hemorrhage weapons and shields, and the Ashes of War among its skills; unique skills come with their weapon. The three Dancer's weapons that bleed are left out, so the talisman doesn't take a slot from the moveset talismans (#17. Dancer's weapons).

Rows: `bleed_boosts_blood_exultation`, `blood_exultation_boosts_white_mask_sets`

### 28. No paired weapons in unpaired classes

P1. `Knight` and `Spellblade` hold something in the other hand, so a paired weapon doesn't work there. A selector can't subtract the 9 named paired weapons from a weapon class, so they are removed by class.

Rows: `knight_spellblade_no_paired_weapons`

### 29. Grafted Dragon only on Jester

P2. It suits the joker class, and the two warrior classes list the fist class it belongs to.

Rows: `grafted_dragon_only_on_jester`

### 30. Heavy rules remove the light sets

P1. `Overloaded` and `Heavy rolling` need equip load, and the 9 light sets keep slots empty; armor rolls after the rules.

Rows: `overloaded_rule_removes_light_sets`, `heavy_rolling_rule_removes_light_sets`

### 31. No armor rolls the Naked Set

P1. The card then shows what the rule asks, so it needs no "rules take precedence" banner; armor rolls after the rules.

Rows: `no_armor_rule_makes_naked_set_top`

### 32. Caster left hand

P2. Owner, 2026-11-17: over a whole run and every stat allocation, a `Sorcerer` left hand holds a glintstone staff about 50% of the time, a small or medium shield about 30%, at their relative counts, and `Jellyfish Shield` about 18%; a `Pyromancer` left hand a seal about 45%, a shield about 35% and `Jellyfish Shield` about 18%; never `none`. A left-hand catalyst often boosts the spell's school or casting speed (`Azur's Glintstone Staff`) and `Jellyfish Shield`'s skill is an active damage buff, so the hand serves offence about two thirds of the time; the other shields are there for defence and variety. Builds that raise only Intelligence or Faith reach `Jellyfish Shield` from the Altus Plateau on and hold it about 11% of a run. `Jellyfish Shield` is a greatshield, so the pools name it alone. The values are aimed at those shares over a whole run and every stat allocation, so they differ by class: seals already roll at odds 2 (#Base odds). Catch-up shifts the mix over a run as late catalysts and shields arrive: the late seals' large share suits Pyromancer, since the best seals for each school come from the Altus Plateau on, mostly Leyndell, the Mountaintops and the DLC; and `Jellyfish Shield`, in reach from Liurnia, shows mostly early and needs 20 Str and 14 Dex, which pure Intelligence and Faith builds reach only mid-run. The catalyst rows hold only once the right hand has rolled, so they act on the left hand alone: `Sorcerer`'s right hand also rolls `Carian Sorcery Sword` (#35. Carian Sorcery Sword), which they would otherwise cut against the staves.

Rows: `sorcerer_lh_prefers_a_catalyst`, `pyromancer_lh_prefers_a_catalyst`, `sorcerer_lh_jellyfish_shield`, `pyromancer_lh_jellyfish_shield`

### 33. Talismans a class can't use

P1. A talisman that does nothing for the loadout wastes the slot, and the talisman pool is small enough that each one shifts the rest. From each talisman's Fextralife page, owner's rulings, 2026-11-14:

- Critical hits, R1 chains, jump, roll and dash attacks, charged attacks and successive melee hits (`Dagger Talisman`, `Twinblade Talisman`, `Claw Talisman`, `Retaliatory Crossed-Tree`, `Lacerating Crossed-Tree`, `Blade of Mercy`, `Godskin Swaddling Cloth`, `Axe Talisman`) need melee: never `Sorcerer`, `Pyromancer` or `Ranger` (the wiki says bows don't count), and never `Jester`, taken as a whole rather than by what its right hand holds. `Sorcerer` rolls the two critical-hit talismans, `Dagger Talisman` and `Blade of Mercy`, with a parry ash in its left hand (#37. Ripostes).
- `Curved Sword Talisman` boosts guard counters: never `Ranger` or a caster, `Spellblade` included.
- `Greatshield Talisman` and `Pearl Shield Talisman` act only while guarding: never `Ranger`, `Sorcerer` or `Pyromancer`; a caster can hide behind a shield, but it isn't a way to fight.
- `Shard of Alexander` boosts skills, so it follows `L2 only` (#6. L2 only needs a skill): never `Sorcerer` or `Pyromancer`, nor an empty right hand.
- `Rellana's Cameo` boosts only stance skills: it needs `Square Off`, `Unsheathe`, `Wing Stance` or `Overhead Stance` on a hand, or `Moonveil`, `Rellana's Twin Blades` or `Sword of Night and Flame`, whose own skills are stances.
- `Beloved Stardust` speeds up casting, so only `Sorcerer`, `Pyromancer` and `Spellblade` roll it. `Old Lord's Talisman` stays for everyone, since any class can lengthen a buff with it.
- `Blue Dancer Charm`, `Rellana's Cameo`, `Kindred of Rot's Exultation` and `Lord of Blood's Exultation` never roll for `Sorcerer` or `Pyromancer`: physical and status-effect builds aren't viable with most spells (owner, 2026-11-17). Their synergies on those classes go with them: a rot or bleed staff no longer boosts the exultations there.

Rows: `melee_talismans_need_a_melee_class`, `melee_talismans_not_on_sorcerer`, `guard_counter_talisman_not_on_casters_or_ranger`, `guard_talismans_not_on_pure_casters_or_ranger`, `talismans_not_on_pure_casters`, `shard_needs_a_skill_not_empty`, `rellanas_cameo_needs_a_stance_skill`, `beloved_stardust_only_on_casters`

### 34. Attack rules a class can't use

P1. Owner, 2026-11-14: `Sorcerer` and `Pyromancer` don't attack physically, so `R1 only` and `R2 only` mean nothing for them; a bow can't attack from the left hand, so `Ranger` never gets `L1 only (can swap hands)`. Jumps, rolls, ripostes and charged attacks are already covered (#2. Charged attacks need a weapon in the right hand, #3. Melee rules need a melee weapon), and `L2 only` by #6. L2 only needs a skill.

Rows: `r1_r2_only_not_on_pure_casters`, `l1_only_not_on_ranger`

### 35. Carian Sorcery Sword

P2. Owner, 2026-11-17 and 2026-11-18: a rare thrusting sword that casts sorceries with L2 in place of an ash. It rolls in `Sorcerer`'s right hand beside the staves and stays in `Spellblade`'s, and never for `Knight` or either Warrior. **Preference:** once in reach it holds about one `Sorcerer` right hand in three, most just after it arrives, by a `×3` row; its base odds stay 1, so its catch-up baseline is untouched. **Synergy:** with it in the right hand, `Sorcerer`'s left hand holds no staff, only small and medium shields and `Jellyfish Shield`: the owner's pairing of the sword with a shield, which also leaves staves more of the left hand beside a staff.

Rows: `carian_sorcery_sword_not_on_knight_or_warriors`, `sorcerer_prefers_carian_sorcery_sword`, `sorcerer_sword_lh_no_catalyst`

### 36. Empty rule slots

Owner, 2026-11-14 and 2026-11-19: about 20% of objectives with no rule, 60% with one and 20% with two. The two slots roll as one draw (#Paired slots), and `None` holds half of each slot taken alone (#Base odds), which alone would give 25%, 50% and 25%; a pair of `None` and a rule weighs `×1.5`, which gives 20%, 60% and 20%.

Rows: `none_beside_a_rule`

### 37. Ripostes

Owner, 2026-11-19. `Dagger Talisman` and `Blade of Mercy` boost critical hits, which come mostly from ripostes.

- **P1.** The game allows no riposte with flails, torches, shields, thrusting shields, staves, seals, ranged weapons, perfume bottles, throwing blades or whips, so with one in the right hand neither talisman rolls, for any class, and neither do `Parry only` and `Land a riposte`, which ask for one.
- **P2.** `Sorcerer` rolls both only with a parry ash in its left hand, so it rolls a left-hand ash; with a staff in the right hand the P1 row still removes them, so they come with `Carian Sorcery Sword` and a shield, on about 2% of its objectives.
- **P2.** `2H Warrior` with a colossal sword, colossal weapon, great hammer, great spear, greataxe, greatsword or hammer in the right hand, whose ripostes hit hardest, gets both at `prefer`: about 19% of its talisman showings with those weapons over a run, 15% before `Blade of Mercy` arrives and 25% after, the pairing adding the partner.
- **P2.** The two come together at `strong`, one row for the pair, whichever slot either would land in (#Paired slots); a `guarantee` synergy still takes a slot first.

Rows: `sorcerer_parry_talismans_need_a_parry_ash`, `riposte_talismans_need_a_riposte_rh`, `riposte_rules_need_a_riposte_rh`, `warrior_2h_heavy_rh_boosts_parry_talismans`, `dagger_talisman_and_blade_of_mercy_come_together`
