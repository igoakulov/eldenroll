# Balance

How the data decides what rolls, how to tune it, and why every odds value other than 1 and every conditional rule is what it is. Change the data and this file together: `pipeline/tests/test_balance.py` fails when a modifier row or an odds value other than 1 is missing here, or listed here but gone from the data. How modifier rows combine: `data/overrides/README.md#Selectors and modifiers`.

## Levers

Three places decide how often anything rolls, and nothing else does (owner, 2026-11-15):

- **Base odds**, per row, in `data/overrides/` (#Base odds).
- **Conditional rules**, the rows of `modifiers.csv` that multiply odds while a condition holds (#Conditional rules).
- **`web/src/engine/hyperparams.ts`**, for what applies to every row (#Hyperparameters), each formula written out there in full.

Engine code holds no weight, multiplier, cap or curve of its own, so every effect on a roll traces to one of the three. Levers by preference: base odds first, the catch-up formula only for what odds can't fix without breaking a share elsewhere, rules to exclude and to prescribe guarantees and synergies.

Every odds reason names what it serves, so a preference can be retuned while the baseline stays: **Catch-up** evens items out over a run (#Late arrivals), **Preference** is taste, **Synergy** a pairing between items. An entry with several labels says how much belongs to each where it can. A conditional rule is a preference or a synergy unless it says otherwise.

## How to tune

- **Read the full-run simulation per stat allocation** (`web/sim/README.md`), never a mix of builds: what a build can use decides what reaches it. Weapons and ashes read in ALL, STR and DEX; spells in the builds whose stats they need; talismans and armor in ALL, STR and ARC. Completion 80 at 200 runs per allocation tells real gaps from luck down to a tenth of a showing a run.
- **Vs fair is the yardstick for catch-up.** It compares an item's showings with an even share of its slot over the run and doesn't depend on odds, so raising an item's odds raises its Vs fair. Items with rows are read by their share where the condition holds instead, against the aim their rule states.
- **A row above ×1 lifts its target past catch-up.** The target is weighed at least at its base share while the row holds, even where catch-up or the ceiling would give it less (#Hyperparameters). A class-wide or always-true boost row therefore acts far beyond its multiplier; lower a class with a row below ×1, which leaves catch-up alone.
- **A pair row is always in play.** In the paired talisman slots, a row linking two options boosts the pair in every objective where both can roll, and catch-up never pays a rule back, so a strong pair row floods both. Aim it at a share and check the peaks by region.
- **Small pools fill.** Two talisman slots always fill unless the empty slot is in the pool, so where few talismans are in reach, lowering one hands its share to the rest; odds only matter against the pool. The early regions' empty slot exists for this (#43. Early talisman slots).
- **Regions:** `boss=boss:<region>` makes a row hold for every boss fought in a region; read its result by the objective's boss region, since the simulation's region tables group by the latest region open.
- **Check after every change:** each synergy's win rate (Synergies tab), the shares of rows' triggers and targets by class and region, and Vs fair by class for the items a change could move.

## Late arrivals

What catch-up must do, whatever its formula; #Hyperparameters holds today's.

### Fair share

- **Every item a slot can roll shows about equally often over a whole run**, however late it arrives and among however many rivals. Odds and rules then steer single items for taste; an item a rule removes stays removed.
- **In reach is decided at the roll:** its region ticked or its boss felled, and its stats within `Max stat gap`. Stats reaching an item late are an arrival too; an item that leaves reach stops counting.
- **Even out with memory.** Each item keeps a tally of the chance it has had, and a roll favours the items furthest behind those that can roll now, so a late arrival catches up and stops once level, and an item behind for any reason is pushed again. The tally is measured against the item's peers, never the roll itself, and counts the chance an item would have had without rules, so a synergy is never paid back.
- **Who shares a tally follows what the player meets:** spells, ashes and the right hand across every class; the left hand and talismans per class, since their pools differ by class. A shared tally counts every class's rolls, so an item only some classes roll falls behind its peers and catch-up pushes it in those classes: the paired weapons, which only the Warriors roll, lead their right hand. It stays shared until that proves a problem (owner, 2026-11-23).
- **Never fall back to plain odds:** they would feed the items in reach longest.
- **Variety over strict parity.** Items with high requirements in a secondary stat (Intelligence for a melee weapon, Faith for a sorcery) may be pushed beyond even by base odds, so a run invites trying them. A high primary-stat requirement earns nothing, since a build's main stat often passes 60.

### No forecast

The engine evens each roll against what can roll now and never predicts the rest of the run: which items a build reaches depends on levels not yet spent, ash pools follow the rolled weapon, and a wrong forecast does worse than none. So early items keep more than an even share, late arrivals fall short when few objectives remain, and items a build reaches late by stats lag. Stat-dependent items are evened out by odds, read per stat allocation (#Base odds); one value serves every build.

### Late-game crowding

The player sees items, not regions: several new items in a row is welcome variety; the same item back soon in its slot is crowding. Four objectives in a row, or five of the last ten, is too much even for an item still owed; the simulation's Too often column counts it.

## Tiers

A modifier multiplies an option's odds. Pick its value from these tiers, or `0` to remove the option:

| Tier | × | Feels like |
|---|---:|---|
| `prefer` | 2 | a nudge |
| `strong` | 10 | clearly more likely |
| `boost` | 100 | likely, but other options still show up |
| `guarantee` | 10,000 | near-certain in a small pool |
| `top` | 1,000,000 | near-certain in any pool |

One boosted option among others at odds 1 wins this often; each ×10 adds about one more 9, never 100%:

| × | In a pool of 10 | In a pool of 100 |
|---:|---:|---:|
| 10 | 53% | 9% |
| 100 | 92% | 50% |
| 1,000 | 99.1% | 91% |
| 10,000 | 99.9% | 99% |
| 1,000,000 | 99.999% | 99.99% |

A pool with fixed shares counts as larger (#Fixed shares). `guarantee` is sized to win 98–99% even in the whole armor pool; one order lower would leave the exultations and the jump sets under 90% (owner, 2026-11-17).

When two boosted options meet in one pool, compare them with each other:

- **Keep guarantees two orders of magnitude apart**, so the higher wins about 99%; ×10 apart splits about 90/10. The build refuses two values of `boost` or above within one order in the same pool.
- **Avoid two `top` targets in one pool:** they split about 50/50. Allowed where the pair is rare; `import-report.json` lists every such pool.
- **When two boosted targets clash, the rarer trigger wins:** the more common one shows its synergy on other objectives. A rule that would contradict the card, such as `No armor` beside a boosted set, is removed by the rarer trigger. `Jester`'s jar sets are the one exception (#39. Pots and perfumes).
- **Off-tier values** are aimed at a target share rather than a feel, and tuned at the simulation.

## Paired slots

The two talisman slots roll as one draw (owner, 2026-11-19): each pair of options weighs its two weights times the rows that link them, so a pairing holds whichever slot either lands in. A row naming a slot of the pair reads the other slot, both ways, and applies once to the pair: two options at weights `a` and `b` with a ×N row between them weigh `N·a·b`, against `a·c` for any other pair holding `a`.

- **Boost one partner, link the other.** Two options boosted by one condition weigh the boost squared as a pair, enough to beat a `guarantee` beside them; so the condition boosts one and a pair row brings the other.
- **A slot rolled alone,** such as a reroll that keeps the first slot, reads the kept one through the same rows.

## Fixed shares

Options found everywhere hold a fixed share of their roll, whatever else is in it, so the room they leave doesn't shrink as the pool grows or vary with a class's exclusions (owner, 2026-11-19):

- **Which:** every option with no location: the `none` item, consumables, the `Naked Set`, the early regions' empty talisman slot `none_talisman` (#43. Early talisman slots), and in the rule slot `None`.
- **How their odds count:** against the rest of the pool counted as 100 odds, whatever its size: `None` at 100 holds half the roll. Among themselves they share by their odds.
- **An empty slot may follow another**, so both talisman slots may roll `none_talisman`.
- **Modifiers work in two steps:** an option's chance in the roll is its share of the rest of the pool times what the fixed shares leave; ×N then takes a chance `p` to `N·p / (1 + (N−1)·p)`. A row aimed at a fixed option multiplies its odds the same way.

## Hyperparameters

`web/src/engine/hyperparams.ts` holds the values that apply to every row; the engine takes them as an argument.

- **`catchUp`** evens out how often items show over a run (#Late arrivals). Modifiers apply on top, so a synergy keeps its full strength; rules and bosses don't get catch-up.
  - **The tally:** for every item and set with a location, the chance it has had in the objectives the player kept, rules left out. A reroll or a discarded objective adds nothing, and a rule never moves a tally. `perCharacterClass` names the slots each class tallies apart, the left hand and talismans; a second talisman or ash counts with the first. The weapon shortlist's rolls are evened among the listed weapons in the right-hand tally.
  - **`even`** raises the lowest tallies among the options with a location that can roll now, per unit of base odds, to one common level with the roll's chance: whoever is furthest behind gets the most, and whoever is above the level sits the roll out. Those options hold their base share of the pool between them, so fixed shares keep theirs.
  - **`ceiling`**, the runway ceiling: catch-up may give an option at most 1.5 times its plain share (its odds over the roll's), divided by the share of the game's rollable bosses still alive when it first could roll. An early arrival can't spike and then fall into a long valley; a late one may catch up harder. It costs late arrivals some of their whole-run share, mostly talismans and ashes arriving a few at a time, which odds make up (#Base odds). Every rollable boss counts toward the run's length, since a player may tick regions as they reach them. Owner, 2026-11-22: kept at 1.5, the linear form, after steeper curves gave back fairness for mid-run arrivals.
  - **`boosted`**: an option with a rule above ×1 active on it is weighed at least at its base share, so a synergy or guarantee holds on an option ahead of its peers.
- **`fixedShare`**: the rest of the pool weighs 100 against the fixed shares' odds (#Fixed shares).
- **`defaultMaxStatGap`**: how far above the player's stats an item may be, per item, never a shared budget.

## Base odds

A row's own odds, for every option that rolls differently all the time. Files: `character_classes.csv`, `combat_rules.csv`, `item_odds.csv`, `boss_odds.csv`, `armor_set_odds.csv` in `data/overrides/`. A boss at 0 is never an objective, and its items roll by region as a regular enemy's would.

### Classes and combat rules

Playstyles and rules that grow tiresome or crowd the rest roll less.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| class | `ranger` `jester` | 0.25–0.5 | owner decision: `Ranger` plays less enjoyably, with less weapon variety than melee or magic; `Jester` mixes silly, quirky and hard ways to fell a boss, which grows annoying when it rolls often |
| rule | `none` | 100 | half the rule slot, a fixed share (#Fixed shares); rule synergies win part of it, so about 40% of objectives roll no rule, close enough to half (owner, 2026-11-24) |
| rule | `do_not_get_hit` `no_healing_flasks` `no_armor` `no_rolling` `overloaded` `parry_only` `l2_only` | 0.5 | owner decision: hard rules: they crowded out the others, limit the moveset a lot (`L2 only` sometimes clashes with an ash), and `No armor` pushed the `Naked Set` and the light sets past their guarantees' reach of each other |
| rule | `drink_deflecting_hardtear` `drink_crimson_sapping_cracked_tear` `drink_bloodsucking_cracked_tear` | 0 | these tears come only from DLC bosses, and rules have no location filter, so they could ask for something out of reach; owner decision: they stay off |

### Never rolled

Items left out: unplayable with a loadout, pointless where they arrive, or crowding out a better one.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `igons_drake_hunt` `lamenters_mask` `rock_heart` `priestess_heart` `litany_of_proper_death` `marikas_soreseal` `warrior_jar_shard` `sacred_scorpion_charm` | 0 | owner decision: easily missed in the game, a transform that conflicts with gear, places hard to pin down, a downside arriving too late, a talisman crowding out a better one, or too few matching ashes and spells where it arrives; each reason in `item_odds.csv` |

### Rare, unique and worth seeing

The largest raise: variety over strict parity (#Fair share).

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `alabaster_lords_sword` `bestial_sling` `black_blade` `blades_of_stone` `blasphemous_blade` `carian_knights_sword` `carian_thrusting_shield` `celebrants_cleaver` `dark_moon_greatsword` `death_lightning` `dragonscale_blade` `dueling_shield` `eclipse_shotel` `envoys_greathorn` `envoys_horn` `envoys_long_horn` `euporia` `flame_of_the_fell_god` `fleeting_microcosm` `fortissaxs_lightning_spear` `frozen_needle` `gavel_of_haima` `ghostflame_breath` `giantsflame_take_thee` `godslayers_greatsword` `golden_order_greatsword` `golem_fist` `halo_scythe` `hoarah_louxs_earthshaker` `horned_warriors_greatsword` `icerind_hatchet` `idus_sword` `inseparable_sword` `iron_cleaver` `lansseaxs_glaive` `lorettas_mastery` `magma_blade` `midras_flame_of_frenzy` `milady` `mohgwyns_sacred_spear` `noble_presence` `rakshasas_great_katana` `reed_great_katana` `retaliatory_crossed_tree` `ringed_finger` `rings_of_spectral_light` `ritual_thrusting_shield` `roar_of_rugalea` `rock_blaster` `rosus_axe` `royal_greatsword` `scarlet_aeonia` `serpent_hunter` `shadow_sunflower_blossom` `smithscript_axe` `smithscript_cirque` `smithscript_dagger` `smithscript_greathammer` `smithscript_shield` `smithscript_spear` `spear_of_the_impaler` `spirit_sword` `star_fist` `stone_of_gurranq` `sword_of_night_and_flame` `treespear` `triple_rings_of_light` `urumi` `wing_of_astel` `zamor_curved_sword` | 1.5–10 | owner decision: **Preference:** rare, unique or striking weapons, ashes, spells and talismans, at least a fair share in the builds that reach them and most at two to three times; throwable weapons three times. Late arrivals' odds also make up for their region (#No forecast). Each value and its reason in `item_odds.csv` |
| item | `coded_sword` | 0.5 | owner decision, 2026-11-23: **Preference:** with a ×3 row for the casters (#46. Pyromancer's weapons) |
| armor_set | `banished_knight_set_caped` `spellblades_set` | 2–3 | owner decision, 2026-11-23: **Preference:** `Banished Knight Set (Caped)` well above a fair share: a striking look from a strong foe, arriving late, in the Mountaintops of the Giants with about 40% of the run left. **Synergy:** `Spellblade's Set` boosts magic ashes of war. Each value in `armor_set_odds.csv` |

### Synergy enablers

Weapons and ashes that bring a synergy hold at least a fair share, most about twice, so the synergy shows.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `ants_skull_plate` `antspur_rapier` `coil_shield` `curseblades_cirque` `dancing_blade_of_ranah` `deadly_poison_perfume_bottle` `eleonoras_poleblade` `flowing_curved_sword` `giants_red_braid` `hand_of_malenia` `leontiels_greatsword` `marais_executioners_sword` `nagakiba` `overhead_stance` `poisoned_hand` `poleblade_of_the_bud` `regalia_of_eochaid` `rotten_battle_hammer` `rotten_crystal_spear` `rotten_crystal_staff` `rotten_crystal_sword` `rotten_greataxe` `rotten_staff` `scorpions_stinger` `serpent_bow` `serpentbone_blade` `square_off` `tooth_whip` `uchigatana` `unsheathe` `venomous_fang` `wing_stance` | 1.5–14 | owner decision: **Synergy:** rot and poison weapons bring `Kindred of Rot's Exultation` (#24. Rot and poison), Dancer's weapons the `Dancer's Set` (#17. Dancer's weapons), stance skills and their carriers `Rellana's Cameo` (#33. Talismans a class can't use), raised to about a fair share since few weapons take a stance; `Leontiel's Greatsword` also as a recent addition, at about three times |

### Late arrivals by region

Catch-up can't make up a late arrival with few objectives left, so odds go by the region where an item first comes into reach (#No forecast).

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `agheels_flame` `ancient_dragons_lightning_spear` `ancient_dragons_lightning_strike` `aspects_of_the_crucible_bloom` `aspects_of_the_crucible_horns` `aspects_of_the_crucible_tail` `aspects_of_the_crucible_thorns` `bayles_flame_lightning` `bayles_tyranny` `black_flame` `black_flame_ritual` `bloodboon` `borealiss_mist` `burn_o_flame` `catch_flame` `divine_beast_tornado` `divine_bird_feathers` `dragonclaw` `dragonfire` `dragonmaw` `electrocharge` `fire_serpent` `fires_deadly_sin` `flame_fall_upon_them` `flame_sling` `frenzied_burst` `frozen_lightning_spear` `furious_blade_of_ansbach` `giant_golden_arc` `golden_arcs` `honed_bolt` `howl_of_shabriri` `inescapable_frenzy` `knights_lightning_spear` `land_of_shadow` `light_of_miquella` `lightning_spear` `lightning_strike` `messmers_orb` `multilayered_ring_of_light` `o_flame` `pest_thread_spears` `placidusaxs_ruin` `poison_mist` `radagons_rings_of_light` `rain_of_fire` `rotten_butterflies` `smarags_glintstone_breath` `spira` `surge_o_flame` `swarm_of_flies` `the_flame_of_frenzy` `theodorixs_magma` `unendurable_frenzy` `watchful_spirit` `wrath_from_afar` | 0.8–6 | owner decision. **Catch-up:** incantations by the region of arrival, from 0.9 in Limgrave to 6 in Enir-Ilim, where higher odds no longer help; sorceries need none |
| item | `backhand_blade` `bloodhound_claws` `caestus` `claws_of_night` `clinging_bone` `danes_footwork` `death_knights_twin_axes` `dryleaf_arts` `falx` `greatsword_of_radahn_light` `greatsword_of_radahn_lord` `hookclaws` `horned_warriors_sword` `iron_ball` `katar` `madding_hand` `ornamental_straight_sword` `pata` `raptor_talons` `rellanas_twin_blades` `reverse_bladed_sword` `spiked_caestus` `starscourge_greatsword` `thiolliers_hidden_needle` `veterans_prosthesis` | 0.2–2 | owner decision. **Catch-up:** paired weapons by the region of arrival. **Preference:** they leave `Dual-Wield Warrior`'s left hand empty, and the class holds about 20% paired through a run (#26. Dual-Wield Warrior pairs); the hand-to-hand ashes at four times their region's odds, since hand-to-hand weapons were underrepresented |

### Armor within a synergy

A synergy's sets share its wins by their odds and catch-up. A set arriving late already wins more than an even share of the objectives where it is in reach, so its share of a whole run's wins stays low whatever its odds (#No forecast).

| Kind | Id | Odds | Why |
|---|---|---:|---|
| armor_set | `gravebird_set` `naked_set` `mutated_mushroom_set` `infected_fell_omen_set` `infected_guardian_set` | 0.5–5 | owner decision, 2026-11-23: **Synergy:** shares within a synergy's sets: `Gravebird Set` raised beside `Raptor's Set` under `Jump attacks only`; the `Naked Set` lowered from the largest share of `Blue Dancer Charm`'s light sets; `Mutated Mushroom Set` and `Infected Fell Omen Set` half of `Kindred of Rot's Exultation`'s sets, the rest even. Each value and its reason in `armor_set_odds.csv` |

### Armor arriving late

Sets arriving from Nokron on read about two thirds of a fair share over a run, and Enir-Ilim's about a sixth. By then the earlier sets have had their share and mostly sit out, so the late rolls already go mostly to the late sets: raising every late set together only moves rolls among them, and a set gains only when raised above its neighbours (owner, 2026-11-23). So only Leyndell's sets are raised, and Leda's as a pair.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| armor_set | `alberichs_set` `bloodsoaked_set` `fell_omen_set` `golden_order_set` `lionels_set` `nomadic_merchants_set` `omen_set` `omenkiller_set` `raging_wolf_set` | 2 | owner decision, 2026-11-23: **Catch-up:** Leyndell, Royal Capital: they also leave reach once Maliketh falls, unless already shown, and read about half a fair share at odds 1 |
| armor_set | `ledas_knight_set` `ledas_surgeon_set` | 3–3.5 | owner decision: **Catch-up:** they arrive in Enir-Ilim with about three objectives left. **Synergy:** `Leda's Knight Set` half a step higher, since `Lord of Blood's Exultation` also raises `Leda's Surgeon Set` when both talismans roll, so the two split `Retaliatory Crossed-Tree`'s wins evenly (#41. Retaliatory Crossed-Tree and Leda's sets) |

### Greatshields

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `visage_shield` `one_eyed_shield` `fingerprint_stone_shield` | 2 | owner decision, 2026-11-24: `Visage Shield` **Preference**, too rare in `Jester`'s right hand; `One-Eyed Shield` **Catch-up**, arriving late in the Mountaintops of the Giants; `Fingerprint Stone Shield` reason not recorded |

### Lowered talismans

Talismans that only add challenge, or matter only where a rule brings them.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `crucible_feather_talisman` `crucible_knot_talisman` `crucible_scale_talisman` `daedicars_woe` `fine_crucible_feather_talisman` `marikas_scarseal` `radagons_scarseal` `radagons_soreseal` `shabriris_woe` `talisman_of_all_crucibles` `verdigris_discus` | 0.1–0.5 | owner decision: **Preference:** scarseals, soreseals, woes, crucibles and `Verdigris Discus` only raise the damage taken, for little or no utility, so they roll less; `Crucible Scale Talisman` least, arriving in Leyndell, where a spike of a pure downside suits least |
| item | `talisman_of_lords_bestowal` `companion_jar` `perfumers_talisman` `twinblade_talisman` `dagger_talisman` `blade_of_mercy` `curved_sword_talisman` `red_feathered_branchsword` `blue_feathered_branchsword` | 0.1–0.5 | owner decision: **Preference:** niche or situational talismans; rules raise them where they fit: the critical-hit pair beside a parry or a heavy weapon (#18. Parry ashes, #37. Ripostes), `Curved Sword Talisman` beside `Greatshield Talisman` (#38. Guarding talismans), the branchswords as a pair (#42. Branchswords), the jar and perfume talismans beside pots and perfumes (#39. Pots and perfumes) |

### Item slot, catalysts and Jester

Shares within a slot that the player meets on every objective.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| item | `academy_magic_pot` `acid_spraymist` `albinauric_pot` `alluring_pot` `ancient_dragonbolt_pot` `beastlure_pot` `bloodboil_aromatic` `bone_dart` `call_of_tibia` `crystal_dart` `cuckoo_glintstone` `cursed_blood_pot` `dragon_communion_harpoon` `eternal_sleep_pot` `explosive_stone` `explosive_stone_clump` `fan_daggers` `fetid_pot` `fire_coil` `fire_pot` `fire_spritestone` `freezing_pot` `frenzied_flame_pot` `giantsflame_fire_pot` `glinting_nail` `glintstone_scrap` `gravity_stone_chunk` `gravity_stone_fan` `hefty_fetid_pot` `hefty_fire_pot` `hefty_fly_pot` `hefty_freezing_pot` `hefty_frenzied_flame_pot` `hefty_furnace_pot` `hefty_lightning_pot` `hefty_magic_pot` `hefty_oil_pot` `hefty_poison_pot` `hefty_rancor_pot` `hefty_red_lightning_pot` `hefty_rock_pot` `hefty_rot_pot` `hefty_volcano_pot` `holy_water_pot` `innard_meat` `ironjar_aromatic` `kukri` `large_glintstone_scrap` `lightning_pot` `magic_pot` `oil_pot` `poison_pot` `poison_spraymist` `poisonbone_dart` `poisoned_stone` `poisoned_stone_clump` `rancor_pot` `red_lightning_pot` `redmane_fire_pot` `roped_fetid_pot` `roped_fire_pot` `roped_fly_pot` `roped_frenzied_flame_pot` `roped_holy_water_pot` `roped_lightning_pot` `roped_magic_pot` `roped_oil_pot` `roped_poison_pot` `roped_volcano_pot` `rot_pot` `roundrock` `ruin_fragment` `sacred_order_pot` `sleep_pot` `spark_aromatic` `spritestone` `surging_frenzied_flame` `swarm_pot` `throwing_dagger` `uplifting_aromatic` `volcano_pot` | 0.8–1.4 | owner decision, 2026-11-23: **Preference:** the item slot is half tools, 40% pots and perfumes and 10% other throwables wherever a tool is in reach; in Limgrave, with no tool, pots and perfumes take 80%. The tools weigh a fixed 100 together (#Fixed shares), so the consumables' odds add up to 100: 1.4 for each pot and perfume, 0.8 for each other throwable |
| item | `finger_seal` `godslayers_seal` `giants_seal` `gravel_stone_seal` `clawmark_seal` `golden_order_seal` `erdtree_seal` `dragon_communion_seal` `frenzied_flame_seal` `dryleaf_seal` `fire_knights_seal` `spiraltree_seal` | 2 | a rolled catalyst decides `Spellblade`'s spell type, so staves and seals should hold the ratio of sorceries to incantations, owner 2026-11-16; with fewer seals than staves, seals at twice the odds do |
| item | `perfumed_oil_of_ranah` `regal_omen_bairn` | 2 | owner decision, 2026-11-23: **Preference:** more powerful versions of their kind, far more viable against a boss on their own; every other tool rolls at 1. A tool alone in reach takes the whole tools' half until another arrives, and accepted as such: the `Wraith Calling Bell` from Liurnia to Altus, the `Ancestral Infant's Head` in Nokron and Ainsel |
| item | `grafted_dragon` | 3 | `Jester`'s signature right hand; it rolls nowhere else (#29. Grafted Dragon only on Jester) |

### Bosses

| Kind | Id | Odds | Why |
|---|---|---:|---|
| boss | `guardian_golem_highroad_cave` `ancient_hero_of_zamor_weeping_peninsula_tombsward_weeping_evergaol_tombsward_cave_entrance` `kindred_of_rot_seethewater_cave` `dancer_of_ranah_cerulean_coast_southern_nameless_mausoleum_far_southwest_coast` `omenkiller_liurnia_of_the_lakes_west_albinauric_village` `spiritcaller_snail_spiritcaller_cave` | 2.5–10 | each takes about 20% of its region's boss roll, so what it drops comes early: `Blue Dancer Charm`, `Kindred of Rot's Exultation`, the `Dancer's Set`, `Godskin Swaddling Cloth`, `Radagon's Scarseal` and `Crucible Knot Talisman` |
| boss | `blaidd_the_half_wolf_liurnia_of_the_lakes_rannis_rise_seluviss_rise` `fire_knight_kood_specimen_storehouse_shadow_tower` `fire_knight_salza_shadow_keep_west_rampart` `fire_knight_wego_shadow_keep_drained_church_district` `divine_bird_warrior_belurat_tower_settlement_swamp` `divine_bird_warrior_enir_ilim` `ensha_of_the_royal_remains_roundtable_hold` `erdtree_avatar_deeproot_depths` `fire_prelate_mt_gelmir_fort_laiedd` `putrid_avatar_miquellas_haligtree_elphael` `shadow_tree_spirit_gravesite_plain_ellac_river_cave` | 0 | not an objective (`Blaidd the Half-Wolf` is an invader, not a boss fight), but kept so its drops roll by region like a regular enemy's |

## Conditional rules

Every row of `data/overrides/modifiers.csv` belongs to one rule below. A rule always has a condition; what holds all the time is base odds. A new exception between items is added here by priority, then as rows. Rule numbers are stable.

### Priority

| Tier | Meaning | Built |
|---|---|---|
| P1 | without it an objective is impossible, or a slot breaks | required |
| P2 | a synergy worth seeing | required, tuned at the simulation |
| P3 | a rare pair the player can reroll | only if play shows it matters |

### Classes with extra rules

Most classes are just their pools in `slot_pools.csv`. `Dual-Wield Warrior` has its pairs (#26) and no `Grafted Dragon` (#29); `Jester` its right hand and `Jellyfish Shield` in the left beside a free right hand (#19), and odd pairs such as `Spinning Weapon` on a staff are left alone on purpose; `Knight` its thrusting shield (#10) and no paired weapons (#28); `Sorcerer` and `Pyromancer` their left hand (#32); `Sorcerer` a left-hand ash for ripostes (#37); `2H Warrior` and `Dual-Wield Warrior` a `Poisoned Hand` beside poison (#45); `Pyromancer` a seal beside its weapons (#46); `Pyromancer` more `No healing flasks` (#47); `Dual-Wield Warrior` fewer jump attacks (#48); `Jester` talismans that follow its gear (#49); the classes that can't use a talisman or rule lose it (#33, #34).

### 1. Parry only needs a parry ash

P1. The rule can't be obeyed without one.

Rows: `parry_only_needs_a_parry_ash`

### 2. Charged attacks need a weapon in the right hand

P1. `Charged R2/ash/spell only` needs a melee weapon, thrusting shield, torch or perfume bottle in RH, or a staff or seal in either hand, since a charged spell counts (owner, 2026-11-24); `2x break stance with Stonebarb Cracked Tear` a weapon of those or a bow in RH.

Rows: `charged_rule_needs_a_weapon_or_catalyst`, `stonebarb_needs_a_weapon_in_rh`

### 3. Melee rules need a melee weapon

P1. `Jump attacks only`, `Crouch/rolling attacks only`, `Land a riposte` and `No ripostes` need a melee weapon, thrusting shield, torch or perfume bottle in a hand.

Rows: `melee_rules_need_a_melee_weapon_in_a_hand`

### 6. L2 only needs a skill

P1. An empty hand has no skill.

Rows: `l2_only_needs_a_skill_not_empty`

### 10. Knight's thrusting shield

P1. A thrusting shield is the Knight's shield, so with one in RH the left hand rolls `none`; any other RH keeps a shield in LH.

Rows: `knight_thrusting_shield_empties_lh`, `knight_other_rh_keeps_a_shield_in_lh`

### 11. Blue Dancer Charm needs light hands

P1. The charm boosts physical damage at a low equip load, and the hands roll first. A heavy weapon class, staff, seal, thrusting shield or greatshield in RH removes it; with both hands full, RH must be a dagger, straight sword, curved sword, thrusting sword or whip. The left hand must be empty, a seal or `Poisoned Hand` (owner, 2026-11-22 and 2026-11-23): anything else there makes the player too heavy to benefit, and `Poisoned Hand` keeps its own synergy (#45). So `Knight`, always holding a shield, never rolls it.

Rows: `heavy_rh_removes_blue_dancer_charm`, `two_hands_need_a_lightest_rh_for_blue_dancer_charm`, `blue_dancer_charm_needs_an_empty_or_seal_lh`

### 12. Blue Dancer Charm and the light sets

P2. The charm wants a light load, so the 9 light sets (`guarantee`) and `No armor` (`strong`) follow it. The charm keeps base odds (owner, 2026-11-20): #11 already keeps it to light builds.

Rows: `blue_dancer_charm_boosts_light_sets`, `blue_dancer_charm_boosts_no_armor`

### 13. Claw Talisman and jump attacks

P2. The talisman boosts jump attacks, so it boosts `Jump attacks only` `×25`, off-tier, for the rule on about one objective in three that holds the talisman (owner, 2026-11-24): the talisman is common on the melee classes, and a top-tier row filled their runs with the rule. The rule brings the jump sets (#23); the talisman doesn't boost the sets itself, which would double-dip.

Rows: `claw_talisman_boosts_jump_attacks`

### 14. Shards and L2 only

P2. `Shard of Alexander` and `Warrior Jar Shard` boost skills, so they boost `L2 only` `×90`, off-tier, for the rule on about one objective in three that holds a shard (owner, 2026-11-24). It stays below `×100` because a parry ash's `×200` on `Parry only` shares the rule pool, and the build refuses two values of `boost` or above within one order (#Tiers).

Rows: `shards_boost_l2_only`

### 15. Axe Talisman and charged attacks

P2. The talisman boosts charged attacks, so it boosts `Charged R2/ash/spell only` and `2x break stance with Stonebarb Cracked Tear` `×25`, off-tier, for one of the two on about one objective in three that holds the talisman, split about evenly (owner, 2026-11-24): like `Claw Talisman` (#13), it is common on the melee classes.

Rows: `axe_talisman_boosts_charged_rules`

### 17. Dancer's weapons

P2. `Curseblade's Cirque`, `Dancing Blade of Ranah`, `Eleonora's Poleblade`, `Flowing Curved Sword`, `Giant's Red Braid`, `Hand of Malenia`, `Marais Executioner's Sword` and `Regalia of Eochaid` suit the Dancer's moveset. One in a hand makes the `Dancer's Set` top tier, and `Shard of Alexander`, `Warrior Jar Shard` and `Axe Talisman` next; it removes `No armor`, whose `Naked Set` would split the armor roll. The set beats every other boosted set: it comes late, when the others have had their turns. The weapons roll at about twice a fair share (#Base odds).

Rows: `dancers_weapon_makes_dancers_set_top`, `dancers_weapon_boosts_moveset_talismans`, `dancers_weapon_removes_no_armor`

### 18. Parry ashes

P2. A parry ash in a hand boosts `Parry only` `×200`, off-tier, for about three a run over every class (owner, 2026-11-24): the rule is very hard and impossible against a few bosses, so it stays rare, and almost all of it falls to `Knight`, whose shield holds a parry ash on about a quarter of its objectives. The parry ash also boosts `Dagger Talisman` (`boost` on its odds of 0.25, so `×400`), whose critical hits a parry sets up; `Blade of Mercy` joins it by the pair row (#37).

Rows: `parry_ash_boosts_parry_talismans`, `parry_ash_boosts_parry_only`

### 19. Jester's right hand

P2. An empty right hand is part of the joke: `none` at `×33` holds a quarter of the hand (#Fixed shares), the staff `×2`, torches `×0.5`. While only Limgrave is open the torches take about 45% of the hand, since few other items are in reach there (owner, 2026-11-24).

The staff is there to hold `Spinning Weapon`, the only ash a staff takes, which Rogier sells only past `Margit, the Fell Omen`; so the staff, like the ash, counts as found at Margit (`data/overrides/boss_slot_links.csv`, owner 2026-11-24).

P1. `Jellyfish Shield` is `Jester`'s left hand, for its damage buff, beside a right hand that leaves the left free: `none`, a torch or a perfume bottle; any other right hand leaves the left empty (owner, 2026-11-24). The left hand's tally is per class (#Fair share), and with the rows the shield is the only option where it rolls, so its odds don't matter.

Rows: `jester_none_x33`, `jester_staff_x2`, `jester_torches_x0_5`, `jester_jellyfish_needs_a_free_rh`, `jester_free_rh_keeps_jellyfish_in_lh`

### 22. Buff ashes on weapons that refuse them

P3. `Golem Fist`, `Lizard Greatsword`, `Smithscript Axe`, `Smithscript Greathammer`, `Smithscript Spear` and `Smithscript Dagger` can't take an ash that buffs the weapon; one in a hand removes those ashes from both hands.

Rows: `buff_ash_weapon_removes_buff_ashes`

### 23. Jump attacks and the jump sets

P2. The `Gravebird` and `Raptor's` chests boost jump attacks, so they follow `Jump attacks only`. The rule is rarer than `Kindred of Rot's Exultation`, so it removes the `Mushroom Crown` sets.

Rows: `jump_attacks_rule_boosts_jump_sets`, `jump_attacks_rule_removes_mushroom_sets`

### 24. Rot and poison

P2. A rot or poison weapon, shield or ash in a hand makes `Kindred of Rot's Exultation` near-certain (`guarantee`), and the talisman puts the 5 `Mushroom Crown` sets in the guarantee tier: weapon to talisman to set, never weapon to set, so nothing double-dips. The talisman removes `Blue Dancer Charm`. Both exultations keep base odds (owner, 2026-11-19): at lower odds a pair of boosted talismans could beat them in the pair draw.

Rows: `rot_boosts_kindred_exultation`, `kindred_exultation_boosts_mushroom_sets`, `kindred_exultation_removes_blue_dancer_charm`

### 25. Blasphemous Blade and Prayerful Strike

P2. Their L2 heals a lot, so `No healing flasks` goes top tier and `Overloaded` becomes playable at `×5` (owner, 2026-11-24), and the rules that forbid L2 are removed.

Rows: `blasphemous_blade_makes_no_healing_flasks_top`, `blasphemous_blade_boosts_overloaded`, `prayerful_strike_makes_no_healing_flasks_top`, `prayerful_strike_boosts_overloaded`, `blasphemous_blade_needs_l2`, `prayerful_strike_needs_l2`

### 26. Dual-Wield Warrior pairs

P2. The class's identity, as odds rather than a filter (owner, 2026-11-17): about 65% same-class pairs, 20% a paired weapon with LH `none`, 15% two classes. Once RH has rolled, LH weapons of RH's class get `×70`; a paired weapon in RH, by class or by name (every weapon without the two-handed strength bonus but `Grafted Dragon` and `Starscourge Greatsword`), leaves LH `none`, except `Venomous Fang`, which brings `Poisoned Hand` (#45); any other RH keeps an unpaired LH. A light RH removes every heavy class from LH. The paired share is set by the paired weapons' own odds, by the region where each arrives, except the paired weapons raised for their own sake: the throwables (#Base odds), and `Red Bear's Claw` and `Beast Claw` at plain odds as unique weapons (owner, 2026-11-23), which lift it to about a third in the DLC.

Rows: `warrior_dw_pairs_greatsword`, `warrior_dw_pairs_straight_sword`, `warrior_dw_pairs_colossal_weapon`, `warrior_dw_pairs_spear`, `warrior_dw_pairs_dagger`, `warrior_dw_pairs_halberd`, `warrior_dw_pairs_curved_sword`, `warrior_dw_pairs_axe`, `warrior_dw_pairs_hammer`, `warrior_dw_pairs_great_hammer`, `warrior_dw_pairs_greataxe`, `warrior_dw_pairs_colossal_sword`, `warrior_dw_pairs_curved_greatsword`, `warrior_dw_pairs_katana`, `warrior_dw_pairs_great_spear`, `warrior_dw_pairs_thrusting_sword`, `warrior_dw_pairs_twinblade`, `warrior_dw_pairs_flail`, `warrior_dw_pairs_whip`, `warrior_dw_pairs_heavy_thrusting_sword`, `warrior_dw_pairs_reaper`, `warrior_dw_pairs_great_katana`, `warrior_dw_pairs_light_greatsword`, `warrior_dw_paired_class_empties_lh`, `warrior_dw_paired_weapon_empties_lh`, `warrior_dw_unpaired_rh_keeps_lh_unpaired`, `warrior_dw_light_rh_removes_heavy_lh`

### 27. Bleed

P2. A bleed weapon, shield or ash in a hand makes `Lord of Blood's Exultation` near-certain, and the talisman boosts the 11 `White Mask` sets (`strong`), aiming at the mask on 33–50% of those objectives: bleed items are far more common than rot ones. The three Dancer's weapons that bleed are left out, so the talisman doesn't take the moveset talismans' slot.

Rows: `bleed_boosts_blood_exultation`, `blood_exultation_boosts_white_mask_sets`

### 28. No paired weapons in unpaired classes

P1. `Knight` and `Spellblade` hold something in the other hand.

Rows: `knight_spellblade_no_paired_weapons`

### 29. Grafted Dragon only on Jester

P2. It suits the joker class; the warriors list its fist class.

Rows: `grafted_dragon_only_on_jester`

### 30. Heavy rules remove the light sets

P1. `Overloaded` and `Heavy rolling` need equip load.

Rows: `overloaded_rule_removes_light_sets`, `heavy_rolling_rule_removes_light_sets`

### 31. No armor rolls the Naked Set

P1. The card then shows what the rule asks.

Rows: `no_armor_rule_makes_naked_set_top`

### 32. Caster left hand

P2. Owner, 2026-11-17: over a run, a `Sorcerer` left hand holds a staff about 50%, a small or medium shield about 30% and `Jellyfish Shield` about 18%; a `Pyromancer` left hand a seal about 45%, a shield about 35% and `Jellyfish Shield` about 18%; never `none`. A catalyst often boosts the spell and `Jellyfish Shield`'s skill is a damage buff, so the hand serves offence about two thirds of the time.

Rows: `sorcerer_lh_prefers_a_catalyst`, `pyromancer_lh_prefers_a_catalyst`, `sorcerer_lh_jellyfish_shield`, `pyromancer_lh_jellyfish_shield`

### 33. Talismans a class can't use

P1. A talisman that does nothing for the loadout wastes the slot (owner, 2026-11-14 and 2026-11-22):

- Critical hit, R1 chain, jump, roll, charged and successive-hit talismans need melee: never `Sorcerer`, `Pyromancer`, `Ranger` or `Jester`; `Sorcerer` rolls the two critical-hit ones with a parry ash (#37).
- `Shard of Alexander` follows `L2 only` (#6).
- `Rellana's Cameo` boosts stance skills: it needs `Square Off`, `Unsheathe`, `Wing Stance` or `Overhead Stance` on a hand, or `Moonveil`, `Rellana's Twin Blades`, `Sword of Night and Flame` or `Leontiel's Greatsword`. The stances and their carriers are raised to about a fair share (#Base odds).
- `Beloved Stardust` speeds up casting: only `Sorcerer`, `Pyromancer` and `Spellblade`.
- `Blue Dancer Charm`, `Rellana's Cameo` and both exultations never roll for `Sorcerer` or `Pyromancer`: physical and status builds aren't viable with most spells.
- `Godskin Swaddling Cloth` heals by attacking: not `Knight`, too defensive, nor `Spellblade`, which casts from afar part of the time.

Rows: `melee_talismans_need_a_melee_class`, `melee_talismans_not_on_sorcerer`, `talismans_not_on_pure_casters`, `shard_needs_a_skill_not_empty`, `rellanas_cameo_needs_a_stance_skill`, `beloved_stardust_only_on_casters`, `godskin_swaddling_cloth_not_on_knight_or_spellblade`

### 34. Rules a class can't use

P1. One row per class, owner 2026-11-24 unless said:

- **`2H Warrior`:** no `L1 only`: reason not recorded.
- **`Dual-Wield Warrior`:** no `Charged R2/ash/spell only` or `2x break stance with Stonebarb Cracked Tear`: reason not recorded.
- **`Ranger`:** no `L1 only`, since a bow can't attack from the left hand; no `L2 only`, `R2 only` or the Stonebarb rule: reason not recorded.
- **`Sorcerer` and `Pyromancer`:** they kill bosses with spells and don't attack physically, so no `R1 only`, `R2 only`, `L2 only`, `Jump attacks only`, `Crouch/rolling attacks only` or the Stonebarb rule; no `L1 only`: reason not recorded.
- **`Spellblade`:** no `L1 only`: reason not recorded.
- **`Jester`:** its weapons are a mix that rarely allows a moveset rule, and even with one that does, its fights are hard enough: no `R1 only`, `R2 only`, `L1 only`, `L2 only`, `Charged R2/ash/spell only`, `Jump attacks only`, `Crouch/rolling attacks only`, `Parry only`, `Land a riposte`, `No ripostes`, `No buffs`, `No talismans` or the Stonebarb rule.

Rows: `warrior_2h_rules_excluded`, `warrior_dw_rules_excluded`, `ranger_rules_excluded`, `casters_rules_excluded`, `spellblade_rules_excluded`, `jester_rules_excluded`

### 35. Carian Sorcery Sword

P2. Owner, 2026-11-17: a thrusting sword that casts sorceries with L2. It rolls in `Sorcerer`'s and `Spellblade`'s right hand, never for `Knight` or the Warriors. **Preference:** about one `Sorcerer` right hand in three once in reach, by `×3`; builds low in Intelligence see it more, which suits them. **Synergy:** with it, `Sorcerer`'s left hand holds a shield, never a staff.

Rows: `carian_sorcery_sword_not_on_knight_or_warriors`, `sorcerer_prefers_carian_sorcery_sword`, `sorcerer_sword_lh_no_catalyst`

### 37. Ripostes

Owner, 2026-11-19 and 2026-11-22. `Dagger Talisman` and `Blade of Mercy` boost critical hits, mostly from ripostes.

- **P1.** A right hand that can't riposte (flails, torches, shields, staves, seals, ranged weapons, perfume bottles, throwing blades, whips) removes both, and `Parry only` and `Land a riposte`.
- **P2.** `Sorcerer` rolls both only with a parry ash in its left hand.
- **P2.** Everywhere but `2H Warrior`, `Blade of Mercy` joins `Dagger Talisman` nearly always, by a pair row.
- **P2.** `2H Warrior` with a heavy weapon, whose ripostes hit hardest, gets `Blade of Mercy` on about a third of those objectives once it can roll, by `×2`. A partner joins it about half the time, `Axe Talisman` three times in five (`×2` on those weapons and a `×10` pair row, the same heavy-hit playstyle) and `Dagger Talisman` two (`×50`).

Rows: `sorcerer_parry_talismans_need_a_parry_ash`, `riposte_talismans_need_a_riposte_rh`, `riposte_rules_need_a_riposte_rh`, `warrior_2h_heavy_rh_boosts_blade_of_mercy`, `mercy_joins_dagger`, `dagger_joins_mercy`, `axe_joins_mercy`, `warrior_2h_heavy_rh_boosts_axe_talisman`

### 38. Guarding talismans

Owner, 2026-11-19. `Greatshield Talisman` raises guard boost, `Pearl Shield Talisman` the elemental damage a guard blocks, `Curved Sword Talisman` guard counters.

- **P1.** Only `Knight`, `2H Warrior` and `Jester` guard as a way to fight; `Pearl Shield Talisman` isn't `2H Warrior`'s; `Jester` needs a greatshield in RH, and `2H Warrior` `Curved Sword Talisman` a heavy weapon or thrusting shield.
- **P2.** `Knight` with a shield and no parry ash gets `Greatshield Talisman` nearly always (`boost`) and `Pearl Shield Talisman` sometimes (`×5`); a thrusting shield in RH gets `Greatshield Talisman` at `×1000`.
- **P2.** `Curved Sword Talisman` comes almost only beside `Greatshield Talisman`, by pair rows: about 30% of `Knight`'s and `Jester`'s greatshield showings, 15% with a thrusting shield.
- **P2.** `2H Warrior` with a weapon that guards well gets `Greatshield Talisman` on about 20% of those objectives, mostly with `Curved Sword Talisman`: the weapon lowers it to `×0.5` alone, and a `×1000` pair row brings the pair.

Rows: `guard_talismans_need_a_guarding_class`, `pearl_shield_talisman_not_on_warrior_2h`, `jester_guard_talismans_need_a_greatshield`, `warrior_2h_curved_sword_talisman_needs_a_guarding_rh`, `knight_shield_boosts_greatshield_talisman`, `knight_shield_boosts_pearl_shield_talisman`, `thrusting_shield_boosts_greatshield_talisman`, `warrior_2h_heavy_rh_lowers_greatshield_talisman`, `greatshield_talisman_brings_curved_sword_talisman`, `thrusting_shield_greatshield_talisman_brings_curved_sword_talisman`, `warrior_2h_heavy_greatshield_talisman_brings_curved_sword_talisman`

### 39. Pots and perfumes

Owner, 2026-11-20. `Companion Jar` and `Perfumer's Talisman` follow `Any pots / perfumes` in the item slot.

- **P1.** `Companion Jar` rolls only with `Any pots / perfumes`; `Perfumer's Talisman` with it or a perfume bottle in a hand.
- **P2.** `Jester` with `Any pots / perfumes` gets `Perfume Jar` and `Depraved Perfume Jar` top tier, equally, so the jars win over the Mushroom Crown sets when both hold, though the pots are the commoner trigger, and split with the `Naked Set` under `No armor` (owner, 2026-11-24).

Rows: `perfumers_talisman_needs_pots_perfumes`, `companion_jar_needs_pots_perfumes`, `jester_pots_perfumes_guarantee_jar_sets`

### 40. Summons

Owner, 2026-11-24. **Synergy:** `Use a summon` rolls only beside `Dried Bouquet`, which boosts it `×40`: certain would make it several times as common as other rules for the casters, who roll the talisman on about a tenth of their objectives against about 1% for `Knight`. The rule wins about half of those objectives, more for classes with fewer rules.

Rows: `summon_rule_needs_dried_bouquet`, `dried_bouquet_boosts_summon_rule`

### 41. Retaliatory Crossed-Tree and Leda's sets

Owner, 2026-11-20. `Retaliatory Crossed-Tree` makes `Leda's Knight Set` and `Leda's Surgeon Set` top tier: **Synergy**, reason not recorded. The sets arrive only in Enir-Ilim, with about three objectives left, so they also roll at raised odds (#Armor arriving late).

Rows: `retaliatory_crossed_tree_makes_leda_sets_top`

### 42. Branchswords

Owner, 2026-11-22. **Preference:** the two branchswords suit builds that fight at range, so `Knight` and both Warriors never roll them. **Synergy:** they come as a pair, by a `×115` pair row aimed at the pair on about 15% of objectives; at odds 0.4 each. Few other talismans are in reach for the five classes that roll them in Liurnia and Caelid, so rows there hold either one to about a third of objectives, and the empty slot (#43) takes the rest.

Rows: `branchswords_not_on_melee_warriors`, `branchswords_come_in_pairs`, `branchswords_spellblade_liurnia`, `branchswords_spellblade_caelid`, `branchswords_ranger_liurnia`, `branchswords_ranger_caelid`, `branchswords_jester_liurnia`, `branchswords_jester_caelid`, `branchswords_sorcerer_liurnia`, `branchswords_sorcerer_caelid`, `branchswords_pyromancer_liurnia`, `branchswords_pyromancer_caelid`

### 43. Early talisman slots

Owner, 2026-11-22. In Limgrave, Liurnia and Caelid few talismans are in reach, and the two slots always filled, so the scarseals and soreseals took 45–100% of objectives. Before `Margit, the Fell Omen` is felled only one talisman rolls (`web/src/engine/README.md#Closed slots`), as in the game, which most of a run's Limgrave objectives are. There, the talisman pools hold an empty slot, `none_talisman`, shown as `any` so the player picks freely; it holds a fixed share (#Fixed shares), set per class and region by rows, and never rolls once the objective's boss is past Caelid. Rows per class and region hold `Any Scarseal / Soreseal` to at most about 30% of objectives (**Preference**: it only raises damage taken), and the empty slot takes what they give up, so every other talisman keeps its share. In Limgrave, `Sorcerer` and `Pyromancer` have almost nothing else in reach, so about two thirds of their talisman slots are empty there.

Rows: `none_talisman_only_early`, `none_talisman_knight_limgrave`, `none_talisman_knight_liurnia`, `none_talisman_knight_caelid`, `none_talisman_warrior_2h_limgrave`, `none_talisman_warrior_2h_liurnia`, `none_talisman_warrior_2h_caelid`, `none_talisman_warrior_dw_limgrave`, `none_talisman_warrior_dw_liurnia`, `none_talisman_warrior_dw_caelid`, `none_talisman_spellblade_limgrave`, `none_talisman_spellblade_liurnia`, `none_talisman_spellblade_caelid`, `none_talisman_ranger_limgrave`, `none_talisman_ranger_liurnia`, `none_talisman_ranger_caelid`, `none_talisman_jester_limgrave`, `none_talisman_jester_liurnia`, `none_talisman_jester_caelid`, `none_talisman_sorcerer_limgrave`, `none_talisman_sorcerer_liurnia`, `none_talisman_sorcerer_caelid`, `none_talisman_pyromancer_limgrave`, `none_talisman_pyromancer_liurnia`, `none_talisman_pyromancer_caelid`, `scarseals_knight_limgrave`, `scarseals_knight_liurnia`, `scarseals_knight_caelid`, `scarseals_warrior_2h_limgrave`, `scarseals_warrior_2h_liurnia`, `scarseals_warrior_2h_caelid`, `scarseals_warrior_dw_limgrave`, `scarseals_warrior_dw_liurnia`, `scarseals_warrior_dw_caelid`, `scarseals_spellblade_limgrave`, `scarseals_spellblade_liurnia`, `scarseals_ranger_limgrave`, `scarseals_ranger_liurnia`, `scarseals_jester_limgrave`, `scarseals_jester_liurnia`, `scarseals_sorcerer_limgrave`, `scarseals_sorcerer_liurnia`, `scarseals_pyromancer_limgrave`, `scarseals_pyromancer_liurnia`

### 44. Moveset talismans by class

Owner, 2026-11-22. **Preference:** each melee class features its own: `2H Warrior` `Axe Talisman` and `Blade of Mercy` (#37), `Dual-Wield Warrior` `Claw Talisman`, which both hands heavy raise `×2` for jump attacks with two heavy weapons, all game. `Dual-Wield Warrior` and `Spellblade` don't charge heavy attacks with the right hand, so `Axe Talisman` rolls `×0.7` for them; `Claw Talisman` rolls `×0.7` for `Knight` and `Spellblade`. In Limgrave to Caelid, `Knight`'s `Axe Talisman` rolls `×0.7` and `Curved Sword Talisman` `×3`, for about 20–30% `Curved Sword Talisman` there, against `Axe Talisman`'s early lead.

Rows: `warrior_dw_heavy_pair_boosts_claw_talisman`, `axe_talisman_lower_on_dw_and_spellblade`, `claw_talisman_lower_on_knight_and_spellblade`, `knight_axe_talisman_lower_early`, `knight_curved_sword_talisman_early`

### 45. Poisoned Hand

Owner, 2026-11-23. **Synergy:** `Poisoned Hand` joins a poison weapon in the left hand. `none` holds a fixed 1 in 101 of these hands (#Fixed shares), so rows that remove it everywhere else leave it near-certain where it joins.

- `2H Warrior` gets it beside the triggers of #24. Rot and poison in its right hand or right-hand ash: it also boosts damage, as `Kindred of Rot's Exultation` does.
- `Dual-Wield Warrior` gets it beside `Venomous Fang`: reason not recorded.

Rows: `warrior_2h_lh_poisoned_hand_only_beside_rot`, `warrior_dw_lh_poisoned_hand_only_beside_venomous_fang`

### 46. Pyromancer's weapons

Owner, 2026-11-23. **Preference:** `Coded Sword` and `Cipher Pata` are faith weapons for casters. `Pyromancer`'s right hand rolls them beside the seals, and beside either the left hand rolls only a seal (P1), so the incantation can be cast. `Knight` and the Warriors never roll them: the right hand's tally is shared by every class, so a caster's small right hand showing them often left them rare in the melee classes. Aims in `Pyromancer`'s right hand: each about 5% of the run, the seals about 90%, and no region above about 20%. `Cipher Pata` meets them at odds 1; the runway ceiling caps the spike right after each comes into reach. `Coded Sword` arrives in Leyndell with about a third of `Pyromancer`'s objectives left, so a ×3 row for the casters gives it a share through the rest of the run, at odds 0.5. Only odds times the row matters: catch-up's raise of a late arrival is a multiple of its plain share, and the row multiplies it again, since the tally counts it without rules. So its share of the run and its spike in Leyndell rise together, and about 2.5–3% of the run, peaking near a quarter of the hand, is the compromise.

Rows: `pyromancer_weapon_keeps_a_seal_in_lh`, `faith_weapons_not_on_melee_classes`, `coded_sword_raised_for_casters`

### 47. No healing flasks on Pyromancer

Owner, 2026-11-24. **Preference:** `Pyromancer` has many powerful healing incantations, so `No healing flasks` rolls `×4` for it, making up what `Dried Bouquet` objectives take from it (#40. Summons).

Rows: `pyromancer_prefers_no_healing_flasks`

### 48. Jump attacks on Dual-Wield Warrior

Owner, 2026-11-24. **Preference:** `Dual-Wield Warrior` features `Claw Talisman` (#44), so `Jump attacks only` came about six times as often as an unboosted rule for it; `×0.5` on the rule, with or without the talisman, brings it to about twice.

Rows: `warrior_dw_lowers_jump_attacks`

### 49. Jester's talismans

Owner, 2026-11-24. **Synergy:** `Jester`'s gear brings the talismans that suit it, near-certain unless the branchswords pair up:

- `Shard of Alexander` with `Visage Shield`, `One-Eyed Shield` or the staff in the right hand, whose skills it boosts (`×100`).
- A scorpion charm on about half of the objectives with `Visage Shield` or `One-Eyed Shield` (`×6` on each; catch-up favours the charm furthest behind).
- With pots or perfumes, `Companion Jar` or `Perfumer's Talisman`, never both, about three to one (`×100` and `×20`).
- A perfume bottle in a hand brings `Perfumer's Talisman` for every class (`×100`); only `Jester` rolls bottles.

Under the right-hand triggers the branchsword pair row gets `×100` more, so the pair keeps a share against the boosted talismans; with pots it gets none, since pots show on about half of `Jester`'s objectives, mostly before `Companion Jar` and `Perfumer's Talisman` are in reach, and a row there doubled the pair over the run.

Rows: `jester_skill_rh_boosts_shard`, `jester_shields_boost_scorpion_charms`, `jester_pots_perfumes_boost_companion_jar`, `jester_pots_perfumes_boost_perfumers_talisman`, `jester_companion_jar_excludes_perfumers_talisman`, `perfume_bottle_boosts_perfumers_talisman`, `jester_branchswords_beside_boosted_talismans`

