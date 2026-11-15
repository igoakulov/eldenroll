# Balance

Why the data rolls the way it does: every odds value other than 1 and every conditional rule, with its reason. Read it before tuning, and change the data and this file together: `pipeline/tests/test_balance.py` fails when a modifier row or an odds value other than 1 is missing here, or listed here but gone from the data.

- How modifier rows combine: `data/overrides/README.md#Selectors and modifiers`.
- Most values are provisional until tuned at the full-run simulation (`web/sim/README.md`); values off the tier table (`×67`, `×6`, `×5`, `×3.5`, `×3`, `×0.5`) are deliberate placeholders for it.

## Levers

Three places decide how often anything rolls, and nothing else does:

- **Base odds**, per row, in `data/overrides/` (#Base odds).
- **Conditional rules**, the rows of `modifiers.csv` that multiply odds while a condition holds (#Conditional rules).
- **`web/src/engine/hyperparams.ts`**, for what applies to every row (#Hyperparameters). Each formula is written out there in full, over inputs the engine computes and passes in by name, such as `runLeft`.

Engine code holds no balance of its own: no weight, multiplier, cap or curve that changes a roll lives anywhere else, so every effect on a roll traces to one of the three while tuning. Owner, 2026-11-15.

## Tiers

A modifier multiplies an option's odds. Pick its value from these tiers, or `0` to remove the option:

| Tier | × | Feels like |
|---|---:|---|
| `prefer` | 2 | a nudge |
| `strong` | 10 | clearly more likely |
| `boost` | 100 | likely, but other options still show up |
| `guarantee` | 100,000 | near-certain in a small pool |
| `top` | 10,000,000 | near-certain in any pool |

**Each ×10 adds about one more 9, never 100%.** One boosted option among others at odds 1 wins this often:

| × | In a pool of 10 | In a pool of 100 |
|---:|---:|---:|
| 10 | 53% | 9% |
| 100 | 92% | 50% |
| 1,000 | 99.1% | 91% |
| 10,000 | 99.9% | 99% |
| 100,000 | 99.99% | 99.9% |
| 10,000,000 | 99.9999% | 99.999% |

So the same multiplier feels weaker in a bigger pool, which is why `guarantee` is for small pools (a few armor sets in reach) and `top` for large ones (the rule pool). Both sit an order of magnitude higher than the feel alone needs, because the catch-up boost (#Hyperparameters) weighs the latest items up to about ×20,000: owner, 2026-11-14, broad mechanisms first, guarantees raised to make room. Nothing short of removing every other option makes a roll certain, and a reroll can always show something else.

When two boosted options meet in one pool, compare them with each other, not with the pool:

- **Keep tiers two orders of magnitude apart.** A `top` (×10,000,000) next to a `guarantee` (×100,000) still wins 99% of the time; two tiers only ×10 apart would split about 90/10.
- **Avoid two `top` targets in one pool:** they split about 50/50. It is allowed where the combination is rare, such as `Claw Talisman` with `Axe Talisman`; `import-report.json` lists every pool where it can happen.
- **Soft rows and catch-up compound on top.** A `prefer` or `strong` row on a rival raises the rival, and so does the catch-up boost on a late one; the simulation's Synergies tab shows how often each boosted target still wins.
- **Off-tier values** (`×67`, `×6`, `×5`, `×3.5`, `×3`, `×0.5`) are aimed at a target share rather than a feel, such as Dual-Wield's share of same-class pairs, and are tuned at the simulation.
- **When two boosted targets clash, the rarer trigger wins.** The run should vary, and the more common trigger gets more chances to show its synergy on other objectives. A rule that would contradict the card, such as `No armor` beside a boosted set, is removed by the rarer trigger, since rules roll before armor.

## Hyperparameters

`web/src/engine/hyperparams.ts` holds the balance values that apply to every row, and is where they are tuned against the simulation; the engine takes them as an argument, so a run can override them.

- **`catchUp`** evens out how often items show over a whole run. With every option at its odds, an item in reach from Limgrave gets every objective of the run while a Haligtree one gets the last tenth, so early regions take most of the rolls. It works in two steps, both written out in `hyperparams.ts`; modifiers apply on top of both, so a synergy keeps its full strength. Rules and bosses don't get it.
  - **`boost`** is `(1 / runLeft) ^ 5`, capped at ×20,000, where `runLeft` is the share of the run's bosses still to fell when the item last came into reach, by whichever gate let it in: its region ticked, its boss felled, or the stats and `Max stat gap` reaching it. This is inverse-exposure weighting, as in fair-share scheduling. An item that drops out of reach, by unticking a region or lowering the gap, starts afresh when it comes back, so a region left unticked until late gets a late region's boost. The share counts bosses felled since the start against the rollable ones neither dead at the start, skipped nor locked out alive (the Royal Capital after Maliketh), assuming the player plays to the end, so a player who ticks every region at the start, as on New Game+, gets a boost only from bosses and stats. The exponent is well above 1 because the pool grows as regions open and boss gear waits for its boss, so a late item meets more rivals than the formula counts: at 5 the left hand's earliest and latest regions show at their fair share and the other slots come close, where a higher one overshoots. A lower cap only hides the last regions' gear; the cap keeps what comes into reach in the last objectives, where the formula grows without bound, below the `guarantee` tier (#Tiers).
  - **`inPool`** rescales the boosts within each pool so that the options with a location (an item with a location row, a set with a piece that has one) keep their base odds' share between them: catch-up moves chance only among them. `none`, consumables and anything else found everywhere get no boost and keep their base share, which would otherwise fade as late items' boosts grow, in a way odds can't undo without breaking the early share. In a pool where every option has a location it changes nothing.

  Owner, 2026-11-15: exponent 5, cap ×20,000 and the rescaling, chosen on the simulation.

- **`defaultMaxStatGap`** is how far above the player's stats an item may be. It is per item, never a shared budget, so a loadout of several near-reach items is fine.

## Base odds

A row's own odds, for every option that rolls differently all the time. Files: `character_classes.csv`, `combat_rules.csv`, `item_odds.csv`, `boss_odds.csv`, `armor_set_odds.csv` in `data/overrides/`.

| Kind | Id | Odds | Why |
|---|---|---:|---|
| class | `ranger` | 0.5 | a less enjoyable playstyle, with less weapon variety than melee or magic |
| class | `jester` | 0.25 | a mix of silly, quirky and hard ways to fell a boss, which grows annoying when it rolls often |
| rule | `none` `none_2` | 12 | two `None` rules, so both rule slots can be empty: `rule_2` leaves out what `rule_1` rolled, and the other `None` can still follow. Owner, 2026-11-14: about 20% of objectives with no rule, 59% with one and 21% with two; two slots rolling apart can't make the three equal |
| rule | `do_not_get_hit` `no_healing_flasks` `no_armor` `no_rolling` `overloaded` | 0.5 | owner decision: the full-run simulation (`web/sim/README.md`) showed these five crowding out other rules and, for `no_armor`, pushing the `Naked Set` and the Blue Dancer Charm's light sets past their guarantee's reach of each other |
| rule | `parry_only` `l2_only` | 0.5 | owner decision: both limit the moveset a lot, `L2 only` sometimes clashing with an ash it doesn't suit, so each joins the other hard rules at about 5% |
| rule | `drink_deflecting_hardtear` `drink_crimson_sapping_cracked_tear` `drink_bloodsucking_cracked_tear` | 0 | these tears come only from DLC bosses, and rules have no location filter, so they could ask for something out of reach; owner decision: they stay off |
| item | `grafted_dragon` | 3 | `Jester`'s signature right hand; it rolls nowhere else (#29. Grafted Dragon only on Jester) |
| item | `perfumed_oil_of_ranah` `ancestral_infants_head` `omen_bairn` `regal_omen_bairn` `horned_bairn` | 28 | the item slot rolls tools and consumables together, and consumables far outnumber tools, so each tool rolls at half the odds of the whole `Any pots / perfumes` alias, whose members all sit at 1. Tools keep the region filter and consumables don't, so no tool rolls in the Limgrave region until a boss is felled |
| item | `wraith_calling_bell` | 10 | owner decision: the full-run simulation showed it far ahead of the other tools, since it's reachable from Liurnia while they wait for a later region or boss; brought down to where theirs land |
| item | `bone_dart` `poisonbone_dart` `crystal_dart` `throwing_dagger` `kukri` `fan_daggers` `dragon_communion_harpoon` `ruin_fragment` `roundrock` `poisoned_stone` `poisoned_stone_clump` `explosive_stone` `explosive_stone_clump` `glintstone_scrap` `large_glintstone_scrap` `cuckoo_glintstone` `glinting_nail` `gravity_stone_fan` `gravity_stone_chunk` `fire_spritestone` `spritestone` `fire_coil` `surging_frenzied_flame` `innard_meat` `call_of_tibia` | 0.335 | the throwables, together a third as often as the whole `Any pots / perfumes` alias to start, then owner decision: the full-run simulation still showed them taking the item slot too often, so they're at half that, about a sixth |
| item | `igons_drake_hunt` | 0 | easily missed in the game; `Igon's Greatbow` itself keeps normal odds |
| item | `lamenters_mask` `rock_heart` `priestess_heart` | 0 | transforms that conflict with gear, so an objective can't use one with its loadout |
| item | `litany_of_proper_death` | 0 | its places are hard to pin down, and it is nearly useless against anything not undead |
| item | `finger_seal` `godslayers_seal` `giants_seal` `gravel_stone_seal` `clawmark_seal` `golden_order_seal` `erdtree_seal` `dragon_communion_seal` `frenzied_flame_seal` `dryleaf_seal` `fire_knights_seal` `spiraltree_seal` | 2 | a rolled catalyst decides the spell type and staves outnumber seals about 3 to 1 once past Liurnia, so seals roll at twice the odds to keep `Spellblade` casting each type about evenly |
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

Most classes are just their pools in `slot_pools.csv`. Four have rules on top:

- **Dual-Wield Warrior:** same-class pairs and paired weapons (#26. Dual-Wield Warrior pairs), and `Grafted Dragon` kept out (#29. Grafted Dragon only on Jester).
- **Jester:** its right hand's balance (#19. Jester's right hand), `Grafted Dragon` as its own, and odd pairs, such as `Spinning Weapon` on a staff, left alone on purpose: they are the point of the class. Its pool holds `none`, 6 offensive greatshields, torches, perfume bottles, one staff and `Grafted Dragon`; none of the greatshields is reachable in the Limgrave region, which is accepted because `Jester` rolls about once per run there.
- **Knight:** the thrusting shield (#10. Knight's thrusting shield) and no paired weapons (#28. No paired weapons in unpaired classes).
- **Sorcerer and Pyromancer:** never `L2 only` (#6. L2 only needs a skill), and a second catalyst in LH (#32. A second catalyst for casters).
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

P2. A parry ash in a hand boosts `Dagger Talisman`, `Blade of Mercy` and `Parry only` (`strong`).

Rows: `parry_ash_boosts_parry_talismans`, `parry_ash_boosts_parry_only`

### 19. Jester's right hand

P2. Shapes the class: an empty right hand is part of the joke, so `none` goes `×6`, the staff `×2` and torches `×0.5`, with `Grafted Dragon` at base odds 3. The aims are `none` about a quarter of the hand once greatshields, perfume bottles and `Grafted Dragon` are in reach, and torches about 30% in the Limgrave region. There only `none`, the one staff and a few torches can roll, so a `none` big enough for late in a run would crowd them out; torches get `×3.5` more while the boss is in the Limgrave region. Values preliminary; decay hits `none` hard, so the simulation decides them.

Rows: `jester_none_x6`, `jester_staff_x2`, `jester_torches_x0_5`, `jester_torches_in_limgrave`

### 22. Buff ashes on weapons that refuse them

P3, built on the owner's ruling. `Golem Fist`, `Lizard Greatsword`, `Smithscript Axe`, `Smithscript Greathammer`, `Smithscript Spear` and `Smithscript Dagger` can't take an ash that buffs the weapon (Fextralife). One in a hand removes those ashes. The target can't name a slot, so the other hand loses them too; that costs little.

Rows: `buff_ash_weapon_removes_buff_ashes`

### 23. Jump attacks and the jump sets

P2. The `Gravebird` and `Raptor's` chests boost jump attacks, so they suit `Jump attacks only`, which `Claw Talisman` brings (#13. Claw Talisman and jump attacks). The rule is rarer than `Kindred of Rot's Exultation`, so the rule removes the `Mushroom Crown` sets, which would otherwise win the armor roll with 5 sets against 2.

Rows: `jump_attacks_rule_boosts_jump_sets`, `jump_attacks_rule_removes_mushroom_sets`

### 24. Rot and poison

P2. A rot or poison weapon, shield or ash in a hand makes `Kindred of Rot's Exultation` near-certain (`guarantee`), and the talisman puts the 5 `Mushroom Crown` sets in the guarantee tier, because the crown matters for rot and poison loadouts. The chain goes weapon to talisman to set, never weapon to set, so nothing double-dips, and the three come together. The triggers are the owner's list in the rows. The `Mushroom Crown` sets beat the `Blue Dancer Charm` light sets, so the talisman in the first slot removes the charm from the second; the reverse order needs the charm to beat a near-certain talisman, so it is left. `No armor` and the jump sets win over them (#Tiers, #23. Jump attacks and the jump sets).

Rows: `rot_boosts_kindred_exultation`, `kindred_exultation_boosts_mushroom_sets`, `kindred_exultation_1_removes_blue_dancer_charm`

### 25. Blasphemous Blade and Prayerful Strike

P2. Their L2 heals a lot, so the loadout lives by L2: `No healing flasks` and `Overloaded` become playable and are boosted `×5`, and the rules that forbid L2 are removed.

Rows: `blasphemous_blade_boosts_healing_rules`, `prayerful_strike_boosts_healing_rules`, `blasphemous_blade_needs_l2`, `prayerful_strike_needs_l2`

### 26. Dual-Wield Warrior pairs

P2. The class's identity, as odds rather than a filter. Once RH has rolled, LH weapons of RH's class get about `×67` against other classes only; RH's own odds never drop, so scarce paired classes keep theirs, and a weapon with no reachable partner simply pairs with another class, so there is no re-roll or fallback. A paired weapon in RH, by class or by name, leaves LH `none`; any other RH keeps a real, unpaired LH. Size mismatches, such as a dagger with a colossal weapon, are accepted. The aim is a ballpark, owner 2026-11-14: about 60% same-class pairs, 30% a paired weapon with LH `none` and 10% two classes, with `×67` and `×2` tuned to it at the simulation.

A light weapon in RH (`dagger`, `straight_sword`, `curved_sword`, `thrusting_sword`, `whip`) removes every heavy class from LH outright, by `×0`: owner decision, confirmed once against the simulation and never tracked again, since a `×0` exclusion guarantees the outcome. The classes the game itself calls paired (`fist`, `claw`, `beast_claw`, `hand_to_hand`, `backhand_blade`, `throwing_blade`, drawing a second copy on two-handing) and the named weapons that share that trait despite an ordinary class (every weapon at `str_bonus_2h = false` in `str_bonus_2h.csv` but for `Grafted Dragon` and `Starscourge Greatsword`, which keep the bonus) roll at `×2` for this class: owner decision, Dual-Wield Warrior's identity leans on them.

Rows: `warrior_dw_pairs_greatsword`, `warrior_dw_pairs_straight_sword`, `warrior_dw_pairs_colossal_weapon`, `warrior_dw_pairs_spear`, `warrior_dw_pairs_dagger`, `warrior_dw_pairs_halberd`, `warrior_dw_pairs_curved_sword`, `warrior_dw_pairs_axe`, `warrior_dw_pairs_hammer`, `warrior_dw_pairs_great_hammer`, `warrior_dw_pairs_greataxe`, `warrior_dw_pairs_colossal_sword`, `warrior_dw_pairs_curved_greatsword`, `warrior_dw_pairs_katana`, `warrior_dw_pairs_great_spear`, `warrior_dw_pairs_thrusting_sword`, `warrior_dw_pairs_twinblade`, `warrior_dw_pairs_flail`, `warrior_dw_pairs_whip`, `warrior_dw_pairs_heavy_thrusting_sword`, `warrior_dw_pairs_reaper`, `warrior_dw_pairs_great_katana`, `warrior_dw_pairs_light_greatsword`, `warrior_dw_paired_class_empties_lh`, `warrior_dw_paired_weapon_empties_lh`, `warrior_dw_unpaired_rh_keeps_lh_unpaired`, `warrior_dw_light_rh_removes_heavy_lh`, `warrior_dw_boosts_paired_subcategories`, `warrior_dw_boosts_paired_weapons`

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

### 32. A second catalyst for casters

P2. Small and medium shields crowd a caster's LH at equal odds, so catalysts go `×3` for `Sorcerer` and `Pyromancer`. RH holds only catalysts, so only LH changes; the aim is a second catalyst about half the time once most catalysts are in reach.

Rows: `casters_lh_prefers_a_second_catalyst`

### 33. Talismans a class can't use

P1. A talisman that does nothing for the loadout wastes the slot, and the talisman pool is small enough that each one shifts the rest. From each talisman's Fextralife page, owner's rulings, 2026-11-14:

- Critical hits, R1 chains, jump, roll and dash attacks, charged attacks and successive melee hits (`Dagger Talisman`, `Twinblade Talisman`, `Claw Talisman`, `Retaliatory Crossed-Tree`, `Lacerating Crossed-Tree`, `Blade of Mercy`, `Godskin Swaddling Cloth`, `Axe Talisman`) need melee: never `Sorcerer`, `Pyromancer` or `Ranger` (the wiki says bows don't count), and never `Jester`, taken as a whole rather than by what its right hand holds.
- `Curved Sword Talisman` boosts guard counters: never `Ranger` or a caster, `Spellblade` included.
- `Greatshield Talisman` and `Pearl Shield Talisman` act only while guarding: never `Ranger`, `Sorcerer` or `Pyromancer`; a caster can hide behind a shield, but it isn't a way to fight.
- `Shard of Alexander` boosts skills, so it follows `L2 only` (#6. L2 only needs a skill): never `Sorcerer` or `Pyromancer`, nor an empty right hand.
- `Rellana's Cameo` boosts only stance skills: it needs `Square Off`, `Unsheathe`, `Wing Stance` or `Overhead Stance` on a hand, or `Moonveil`, `Rellana's Twin Blades` or `Sword of Night and Flame`, whose own skills are stances.
- `Beloved Stardust` speeds up casting, so only `Sorcerer`, `Pyromancer` and `Spellblade` roll it. `Old Lord's Talisman` stays for everyone, since any class can lengthen a buff with it.

Rows: `melee_talismans_need_a_melee_class`, `guard_counter_talisman_not_on_casters_or_ranger`, `guard_talismans_not_on_pure_casters_or_ranger`, `shard_not_on_pure_casters`, `shard_needs_a_skill_not_empty`, `rellanas_cameo_needs_a_stance_skill`, `beloved_stardust_only_on_casters`

### 34. Attack rules a class can't use

P1. Owner, 2026-11-14: `Sorcerer` and `Pyromancer` don't attack physically, so `R1 only` and `R2 only` mean nothing for them; a bow can't attack from the left hand, so `Ranger` never gets `L1 only (can swap hands)`. Jumps, rolls, ripostes and charged attacks are already covered (#2. Charged attacks need a weapon in the right hand, #3. Melee rules need a melee weapon), and `L2 only` by #6. L2 only needs a skill.

Rows: `r1_r2_only_not_on_pure_casters`, `l1_only_not_on_ranger`
