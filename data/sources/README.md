# Source files

The inputs the pipeline and its tests read, unchanged apart from their file names. They are grouped by what they are used for; `pipeline/eldenrando/paths.py` is the one place that knows the layout. Corrections never go here: they go in `data/overrides/`, with a reason.

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
| PC randomizer mod | unknown: owner to fill in | unknown | unknown | unknown |
| Spreadsheets | unknown: owner to fill in, including whether they share one origin | unknown | unknown | unknown |
| eldenring-api | the public `deliton/eldenring-api` dataset, base game only. The project calls no API | unknown | unknown | unknown |
| wiki.gg | <https://eldenring.wiki.gg/wiki/Armor_Sets>, transcribed by a small model | unknown | n/a | unknown |

The game's text and data belong to FromSoftware and Bandai Namco. Settle attribution and licensing (`tasklist.md` O13) before making this repository public.
