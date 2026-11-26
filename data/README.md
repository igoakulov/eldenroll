# Data

The database Elden Roll rolls from: what is in it and why, and the rules no single file states. Values and per-row reasons are in the override files; this file doesn't repeat them.

| Folder or file | Holds |
|---|---|
| `sources/` | the source files, unchanged; `sources/README.md` says which wins and the traps in each |
| `overrides/` | corrections and authored seeds; `overrides/README.md` covers the files, formats and how source gaps are answered |
| `balance.md` | the reason for every odds value other than 1 and every conditional rule |
| `build/` | `db.json`, the only file the app reads, and `import-report.json`; git-ignored |

Field types are `pipeline/eldenroll/model/`, mirrored in `web/src/engine/database.ts`. The data gate is `pipeline/eldenroll/validate/`. Counts are pinned by the tests. How the engine uses each row: `web/src/engine/README.md`.

## Scope

The data covers only what rolling objectives needs: which gear exists, who can wield it, where it is found and which boss guards it. It is faithful to the game where that changes a roll, and deliberately loose everywhere else.

An item is a row **if some slot can roll it**. Two kinds are kept although they don't roll, because each is a full row with requirements and locations, so turning one on changes data, not code: armor pieces in no set, which roll once a set names them, and rows at `odds = 0`. There is no `excluded` column: an excluded item never becomes a row.

Notable game data it does not store or use:

| Not in the data | Why |
|---|---|
| Quest events and key item checks, such as the medallion halves | regions stand in for progression: ticking one says its content is reachable |
| Boss stats: level, HP, stats, runes | nothing is filtered by difficulty |
| Regular enemies and merchants as entities | their items are tied to locations directly |
| Gear effects: boosts to stats or damage, bonuses to a school of magic | a loadout is judged by what it is, not its numbers |
| Gear weight and defense | the few weight-based mechanics, such as Blue Dancer Charm and `Overloaded`, are hand-picked synergies and anti-synergies (`balance.md#Conditional rules`) |
| Schools of magic for sorceries and incantations | spells roll by type only |
| Most talismans | only a shortlist that changes how a loadout plays rolls (`pipeline/eldenroll/build/talismans.py`); the other two talisman slots are the player's choice |
| Defensive or utility consumables, non-offensive spells (`build/consumables.py`, `build/spells.py`) | a buff can't be a challenge |
| Arrows and bolts | no slot; ammunition isn't constrained |
| Spirit ashes | summons aren't constrained |
| Crafting cookbooks and ingredients, bell bearings, paintings, letters, Prattling Pates, quest keys | not gear |
| Great runes, crystal tears | runes aren't items; tears are combat rules |
| Unobtainable items (`pipeline/tests/test_armor.py`, `test_weapons.py`, `test_ashes.py`) | not in the game |

## Rows

- **Identity.** `item.id` is a slug of the canonical name; where categories share a name, each takes a category suffix (`glintstone_pebble_ash`, `glintstone_pebble_sorcery`), and a unique slug takes none. `location.id` is the mod's area name, and `location.name` may repeat (`Academy of Raya Lucaria` names four areas). `boss_instance.id` is the boss's slug plus its sheet label's slug, so two fights of one boss never collide.
- **`odds`** is on everything that rolls: class, boss, item, rule, armor set. It is for balance or for turning one off; a condition belongs in a modifier. An armor piece rolls only through its set and has no odds of its own.
- **`infusable`** is a fact about one weapon; which ashes fit its class is `ash_compatibility`, a separate fact. `Raging Beast` fits beast claws; `Red Bear's Claw` is a beast claw that holds none. `false` wins over any ash row.
- **`str_bonus_2h`** follows the weapon class, with exceptions in `overrides/str_bonus_2h.csv`. Every ranged class keeps it.
- **`boss_instance.location`** is the short place the player sees (#Bosses). The sheet's label only builds the id and matches override rows; it never ships.
- **`image`** stays `null` while the MVP has no item pictures; every item shows its subcategory icon until pictures come back.
- **`url`** is the row's Fextralife page, built from its name and checked by hand, not by the build (`data/sources/README.md#Wiki lookups`). An alias links to the wiki's page for the whole group, such as all glintstone staves. `none`, the `None` armor pieces, the `None` alias and rows at `odds = 0` have `null`.

## Catalog decisions

Rules that shape many rows. A single item's reason is on its override row.

### Weapons and shields

- `Throwing Blade` is a weapon class whose only member is `Smithscript Dagger`: melee, paired, and it holds an ash.
- Thrusting shields are weapons outside `melee`.
- Staves and seals stay in the catalog although only caster slots and `Jester` RH select them, so a later caster class needs a selector, not new data.
- `infusable`: Fextralife decides where the unique-skill sheet is unclear (`overrides/infusable.csv`), and the 17 base staves follow the catalyst rule instead: `Carian Regal Scepter` holds no ash, the others take only `Spinning Weapon`, seals hold none.

### Armor

- An altered piece merges into its plain piece, with both forms' locations, because altering is left to the player. Three can't be altered back and stay separate under their game names, because sets name those looks: `Banished Knight Helm (Altered)`, `Banished Knight Armor (Altered)`, `Fire Prelate Armor (Altered)`.
- Sets start from the wiki's Armor Sets page and are ours to change: fill an empty slot, drop `(Altered)` variants, pick one variant per slot, split a set with two looks, add sets the page lacks, compose new ones. None of this touches code.
- A slot a set lacks shows `any`, and the player wears what they like. Where weight matters, for Blue Dancer Charm, a set names `None` pieces instead (`overrides/added_armor.csv`), which keep the slot empty.

### Ashes

- The canonical name drops `Ash of War: `, because an ash rolls only on a weapon slot.
- Ashes the mod has only on a weapon can be taken off, so they join the pool (`overrides/ash_sources.csv`); each takes its weapons' locations, boss-tied ones included.
- `Parry` fits several weapon classes and small and medium shields; the other parry ashes fit those shields only. So `Any parry ash` is 1 option on a weapon and 5 on a shield.

## Placement

`item_location` says where the player finds an item and decides whether it is reachable at all. Exactly one of `location_id` and `boss_instance_id` is set; the null pattern says which case a row is, so there is no `source` column.

| Case | Key | Rows per item |
|---|---|---|
| world pickup, chest, vendor, Roundtable Hold | location | many |
| regular enemy drop | location | one per farm spot |
| boss drop, fog-wall loot, a chest a boss guards | boss | one per instance |
| sold by Enia for a remembrance, or once a boss dies | boss | one, that boss |
| unlocked by a fight whose slot has no boss tag: a Dragon Communion altar, a shop opened by beating its keeper, loot inside the arena (`overrides/boss_slot_links.csv`) | boss | one per instance; any one opens it |
| consumable | none | none |

- An item with no row is a data error, except consumables and the `None` pieces, which count everywhere.
- A boss-tied item's region comes through the boss, never stored twice.
- **Boss-gated.** An item sold or lying in a locked arena, or sold by a boss only once beaten, is tied to that boss, so it never rolls while the way is blocked. A merchant who sells before his fight keeps a location row. A shop that only moves after a fight stays a location row too: tying Patches' Volcano Manor shop to him would let `Estoc` roll anywhere once he is felled.
- **Enia.** Every item she sells for a remembrance or after a boss dies is tied to that boss, so none is reachable from Limgrave alone. Known limitation: she trades one remembrance for one of two items, so an objective may ask for one the player can no longer get.
- **Quest steps.** An item a later quest step unlocks is placed where that step happens (`overrides/placement_areas.csv`), even when the map has it earlier, because a player may kill a gating boss off-objective and never mark it. A quest reward or invader that only appears after a fight stays a plain location row.

## Bosses

- **The pool is every boss fight the wikis name,** not only the 42 bosses the randomizer mod gates content on: the boss sheet's `[Boss]` rows plus the fights it leaves untagged (`overrides/boss_additions.csv`). Of Fandom's unmarked list only `Baleful Shadow` joins, because it forces Ranni's quest; `Elder Dragon Greyoll`, the non-boss tree spirits and avatars, and the Hippopotamus fights stay out. Nothing is filtered by difficulty or remembrance status.
- **One fight is one instance.** Phases and duos split across names merge (`overrides/boss_merges.csv`), and so do fights the sheet lists at two places: a dragon that flies away at half health is an instance only where it is finished.
- **A boss's odds decide only whether it is an objective.** Fights kept for their drops sit at `odds = 0` and act as regular enemies.
- **Shown location** is `Area, Place`, never the sheet's label: dungeons get their area, the mod's own names give way to the game's (`overrides/location_display.csv`), and a fight that would read the same as another of its boss gets a landmark (`overrides/boss_landmarks.csv`). The build fails when two fights of one boss read the same or a location is over 48 characters.

## Settled

Already decided, so not to be reopened without new data: talisman, tool and spell-shop locations, ground and chest pickups and armor-set locations all come from the sources as they are; crystal tears are combat rules, not items.

## Build

`pipeline/README.md` has the command. It runs the gate and writes `build/db.json` and `build/import-report.json` (counts, coverage, pools with several top-tier modifiers, guarantee targets off base odds, dropped values), or nothing when a check fails, naming every failure. Two runs with the same inputs give a byte-identical `db.json`: no timestamp, path or machine value. Nothing under `web/` reads `sources/`.
