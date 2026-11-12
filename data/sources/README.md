# Source files

The inputs the pipeline and its tests read, unchanged apart from their file names. They are grouped by what they are used for; `pipeline/eldenroll/paths.py` is the one place that knows the layout. Corrections never go here: they go in `data/overrides/`, with a reason.

Read this before changing a loader, a build step or an override file. It holds what the code can't say: which source wins, and the traps in each one.

| File | Used for | Source | Original name |
|---|---|---|---|
| `locations/areas.yaml` | the 174 areas | PC randomizer mod | `annotations_stable.txt` |
| `locations/submaps.yaml` | test: label cross-check | PC randomizer mod | `submaps.txt` |
| `locations/location_names.json` | test: name cross-check | eldenring-api | `locations.json` |
| `placement/item_slots.yaml` | where each item is placed | PC randomizer mod | `itemslots_stable.txt` |
| `placement/enemy_drops.csv` | enemy drops | spreadsheet | `item_drop_locations.csv` |
| `placement/enemy_item_lots.csv` | more enemy drops | spreadsheet | `item_drops.csv` |
| `bosses/enemy_locations.csv` | the boss pool | spreadsheet | `boss_creature_locations.csv` |
| `items/item_info.yaml` | pool membership, names | PC randomizer mod | `iteminfo.txt` |
| `items/weapon_shield_classes.csv` | weapon and shield classes | spreadsheet | `weapons_shields_categories.csv` |
| `items/tool_consumable_classes.csv` | tools and consumables | spreadsheet | `tools_consumables_categories.csv` |
| `items/ash_weapon_matrix.csv` | which classes an ash fits | spreadsheet | `ashes_compatibility_no_DLC.csv` |
| `items/weapon_skills.csv` | which weapons have a unique skill | spreadsheet | `ashes_somber_weapons.csv` |
| `items/weapons.json`, `shields.json` | base requirements | eldenring-api | same |
| `items/sorceries.json`, `incantations.json` | base requirements | eldenring-api | same |
| `items/talismans.json`, `ashes.json` | test: name cross-checks | eldenring-api | same |
| `armor/armors.json` | armor slots | eldenring-api | same |
| `armor/armor_sets.txt` | test: set memberships | wiki.gg | `armor_sets_transcribed.txt` |

## Where each source came from

| Source | Origin | Retrieved | Version | License |
|---|---|---|---|---|
| PC randomizer mod | <https://www.nexusmods.com/eldenring/mods/428> | unknown | unknown | unknown |
| Spreadsheets | the datamined resource collection at <https://www.reddit.com/user/sleepless_sheeple/comments/udlb1k/elden_ring_datamined_resource_collection/> | unknown | unknown | unknown |
| eldenring-api | the public `deliton/eldenring-api` dataset, base game only. The project calls no API | unknown | unknown | unknown |
| wiki.gg | <https://eldenring.wiki.gg/wiki/Armor_Sets>, transcribed by a small model | unknown | n/a | unknown |
| Fextralife | <https://eldenring.wiki.fextralife.com>, read page by page for what the other sources lack (#Wiki lookups); answers land in `data/overrides/`, not here | while building, 2026 | n/a | unknown |

The game's text and data belong to FromSoftware and Bandai Namco. Attribution and licensing are not settled yet.

## Precedence

1. The mod's YAML files win for placement, regions, bosses and pool membership.
2. The base-game JSON files win for base-game requirements and names.
3. The spreadsheets win for DLC categories, `infusable` seeds and ash compatibility. The weapon sheet's class also wins over the JSON's `category` (`Gargoyle's Black Axe`, `Vulgar Militia Shotel`, `Beastman's Jar-Shield`).
4. `data/overrides/` wins over everything and records a reason. Wiki results reach the build only through it.
5. A conflict is reported, never silently resolved.

Only files the build or a test reads are here. Other source data stays outside the repository and moves in, with its loader and tests, when a task needs it.

## The mod's YAML files

All parse with `yaml.safe_load`; no line parsers.

- **`item_info` is a lookup, never the catalog.** It names about 2,400 items and most can never roll. Its ids are the identity and its names are labels; ids exist without names.
- **`item_slots.yaml` is the placement source.** The mod's `itemslots.txt` has the same slots with finer `Area` values and is not used.
- **A slot's `DebugText` mixes items and prose.** A line yields an item only when it contains `" - "` and the rest starts with `lot `, `shop ` or `enemy lot `. Direction hints, `Unique location in […]` and `Shop item in […]` lines are prose. A `Shop item in` line names other vendors of the item on the line before it; the slot's `Area` still governs.
- **The `ignore` tag governs, not `Area: unknown`.** Every `unknown` slot is also `ignore`, and two `ignore` slots have a real area (`[ERROR]Rya's Necklace`, an unused-ESD `Glowstone`).
- **`Area` is the grouping key; `FullArea` is reachability.** Map ids are never used for grouping: `m12_01_00_00` is both Ainsel and Lake of Rot, and one area spans several maps.
- **Field shapes that break naive parsing:** `Tags`, `FullArea`, `QuestReqs` and `Includes` are space-separated strings, `''` when empty, not YAML lists. `Areas[].MapNames` is a list of `"<mapid> <name>"` strings. `Areas[].Req` is a boolean expression over areas, events, key items and switches. `Areas[].Until` occurs once: `leyndell` → `ashen`. Values containing `": "` are single-quoted in the source.
- **`areas.yaml` `Events` are not the boss pool.** 42 are bosses the mod gates content on, 4 are world flags. They omit field and dungeon bosses and serve only as a cross-check that each gated boss exists at that area; `mimictear` is on no slot.
- **Slot tags worth knowing:** `ignore` (junk), `tarnished` (real items on base-game maps, and they stay), `norandom` (valid, not randomized by the mod), the fight tags (`boss`, `altboss`, `overworldboss`, `minidungeonboss`, `remembranceboss`, `catacombboss`, `caveboss`, `dragonboss`, `miscboss`, `tunnelboss`, `graveboss`, `miniboss`, `gaolboss`), `cellarbosschest` (a chest a boss guards, so a boss drop), and Enia's `bosssoulshop` and `bossarmorshop`.

## The spreadsheets

- **Two drop sheets, both needed:** `enemy_drops.csv` is primary, `enemy_item_lots.csv` supplementary. `Night Maiden Armor`, `Night Maiden Twin Crown`, `Bloodsoaked Tabard` and `Gelmir Glintstone Staff` are only in the second.
- **`Unused` and `Spirit Summon` labels** in `enemy_item_lots.csv` are not places. They get no alias row and no rollable item depends on them.
- **The drop sheets' `[Boss]` rows hold no pool item,** and the build stops if one ever does, so the sheets only ever add regular-enemy rows.
- **`enemy_locations.csv` (the boss sheet)** has 2 header rows. `[DLC] ` on the location label decides base or DLC; `dlcClear` is `-` everywhere and unused. A label can name several micro-locations, split by `;` or `,`.
- **Boss labels name a map tile, not a place.** One tile can hold several areas. A `location_aliases.csv` row says where most of what carries that label physically is, judged from the mod's slots on that tile, never from which place the label names first. A boss elsewhere on its tile gets a `boss_location_overrides.csv` row; a test checks every boss against the region of its own drop slot.
- **A boss slot joins its instance on the slot line's map label,** and on the name only where a label holds several, because the mod often names an enemy by its model.
- **The tool and consumable sheet** carries the class in `subCategory1` for most rows; `Hefty *` pots carry it in `subCategory2`, and the rest (`-`) are split by an explicit table in `build/consumables.py`, never by a heuristic. `Omen Bairn 1`/`2` are one item, uncharged and charged attack rows. It is the consumables' source, not `item_info`: the mod does not place crafted items.
- **The spells sheet** (`spells.csv`) is attack data, never the spell catalog, so it isn't here.
- **The ash matrix** has no Perfume Bottle column, no great katana column and no columns for the DLC classes; the gaps are rows in `data/overrides/ash_compatibility.csv`.
- **The unique-skill sheet** joins several weapons on one row (`(Nightrider / Chainlink) Flail`). It misses Somber weapons with an ordinary skill and some with a unique one, so it settles `infusable` only together with `data/overrides/infusable.csv`.
- **`weapon_shield_classes.csv`** lists `Unarmed`, which never becomes a row.

## The base-game JSON files

From the public `deliton/eldenring-api` dataset, base game only. Its other files are not used; `items.json` and `bosses.json` likely return for the image step.

- **Values can be wrong while looking normal.** Of 247 weapons compared with the wikis, 9 lacked or swapped a stat (`Grave Scythe` lacks DEX 13). Never write a test value from memory.
- **Misses are reported, not assumed DLC.** Some base weapons are absent (`Bandit's Curved Sword`).
- **Names are labels; ids are the identity.** Names repeat within a file, so no join is keyed on a name. Matching ignores case (`Hand Of Malenia`).
- **Known defects,** each mapped in `data/overrides/name_variants.csv`: misspellings (`Godksin Noble Robe`), a second record of one piece (`Champion Gauntlets`), and `Redmane Knight Helm` naming two records, one of them the gauntlets, so that rename is keyed on the id. `Spellblade's Gloves` has the category `Gauntlet` for `Gauntlets`.
- **`Beast Claw` in `incantations.json`** is the incantation; the weapon is DLC and has no record.
- **`ashes.json` writes the prefix three ways:** `Ash Of War: `, `Ashes Of War: ` and none. `Lost Ashes Of War` is not an ash.
- **Only the fields the build reads are required:** `requiredAttributes` on weapons and shields, `category` on armor, `requires` on spells. A requirement with no usable stat name is left out and the gap check fails the build until `data/overrides/requirements.csv` answers it.

## Matching names

- **Never by substring.**
- **An id on a slot line wins.** `(Goods 6600)` or `(Weapon 68500000)` binds the line exactly; only these separate `Golden Vow` the incantation from the consumable, and `Beast Claw` the incantation from the weapon. Every other line and every drop cell goes by name (`normalize/placement_names.py`).
- **A bare name is never an ash.** Ashes come only from `Ash of War: ` lines and `data/overrides/ash_sources.csv`, so bare `Thops's Barrier`, `Carian Retaliation` and `Glintstone Pebble` are the spells.
- **`by_name` in `name_variants.csv`** lets placement rename a line without an id. It stays `false` where the source name is a real item's name, and the build stops otherwise.
- **Strip only where it belongs:** `+N` on weapons and shields (`Rogier's Rapier +8` is its only location; `Arsenal Charm +1` stays out), `(Altered)` on armor, `[Sorcery] ` and ` x5` everywhere. Enia's armor slot lines name the boss after `after defeating`.
- **An item that won't map is usually misnamed** in one of the sources; look for a near-match before calling it missing.

## Wiki lookups

- Fextralife links are built from names, not looked up: `pipeline/eldenroll/build/wiki.py` builds each row's page from its name, accents dropped (`Great+Epee`), and an Ash of War's as `Ash of War: <name>`. They are checked by hand in a browser, since Fextralife refuses scripted reads.
- A miss gets a row in `data/overrides/wiki_urls.csv`, never a new name: the app shows the game's names, and a variant set we split off shares its base set's page. Misses are pages with a suffix (`Beast+Claw+(Weapon)`), a duo's own page, the wiki's own spelling (`Spirit-Caller Snail`) and group pages. An alias has no name to build from, so its link comes only from that file.
- `&` doesn't reach a page named with `and`: `Nox+Swordstress+%26+Nox+Monk` misses where `Nox+Swordstress+and+Nox+Monk` lands.
- Look up only what the data lacks. No wiki is authoritative: Fextralife can be wrong, and existing records are not re-verified against it.
- wiki.gg marks the same clashes with `(weapon)` and `(spell)`.
- Fandom's boss count of 238 is not a checkable target: its lists add up to 209.
- The armor sets start from the wiki.gg page above. It is a starting point, not a contract.

## Images

Postponed until the image step; nothing here runs before then.

- The base-game art set has no DLC art. Files are named by JSON record id, so the build finds each item's file through its JSON record and copies it to `<folder>/<item id>.png`.
- Four pairs of different items share a byte-identical file, so one of each shows the wrong picture: `Cleanrot Gauntlets` / `Eccentric's Manchettes`, `Night's Cavalry Gauntlets` / `Night's Cavalry Greaves`, `Festive Garb` / `Blue Festive Garb`, `Erdtree Bow` / `Erdtree Greatbow`.
- `items.json` holds `Wraith Calling Bell` and `Glintstone Scrap` twice, and `Ekzykes's Decay` three times under three spellings; use the record spelled right.
- The scraped set carries `FEXTRALIFE` watermarks.
