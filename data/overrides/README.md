# Overrides

Everything the build knows beyond the source files: corrections to them, and the seeds we author. `data/sources/README.md` says which source wins where; this folder wins over all of them. The build reads only these files and the sources.

- **Every correction carries a `reason`;** authored seeds (`regions.csv`, `region_areas.csv`, `character_classes.csv`, `combat_rules.csv`, `aliases.csv`, `slot_pools.csv`, `modifiers.csv`, `location_aliases.csv`) do not. A reason says why in plain words and where it comes from: a project decision, a wiki page, or what the mod's slot says.
- **Every row must apply.** A row that matches nothing stops the build, so a stale override can't linger.
- **Names, not ids,** in files keyed on an item, ash, piece or boss name, written as the game spells them. Files keyed on an id say so in their header (`item_odds.csv`, `armor_set_odds.csv`, `boss_odds.csv`).
- **Odds files list only values other than 1.** Odds 0 keeps a row that never rolls.
- **An exception between two items is not an override:** it is a conditional rule, explained in `data/balance.md` and written as rows in `modifiers.csv`.

## Files

Each file's name and header say what it holds. What they don't say:

| File | Read it as |
|---|---|
| `regions.csv` | `region_level` orders the checkboxes and never filters; DLC regions carry `DLC: ` in `name` |
| `location_aliases.csv` | a label names a map tile, not a place; see `data/sources/README.md#The spreadsheets` |
| `boss_merges.csv` | an empty `instance_label` keeps the row's own label, and the row holding the instance's label locates the fight |
| `boss_names.csv` | an empty `label` means every label |
| `location_display.csv` | an empty `place` shows the area alone |
| `boss_landmarks.csv` | `label` is written without `[DLC] ` |
| `name_variants.csv` | `source_id` keys a record where a name is ambiguous; `by_name` lets placement rename a line that has no id |
| `requirements.csv` | all five stats are stated, so a row replaces a record whole |
| `ash_compatibility.csv` | an empty `subcategory` means the whole category |
| `ash_sources.csv` | a weapon is named as the slot lines name it (`Banished Knight's Halberd +8`), because only that copy carries the ash |
| `item_odds.csv` | armor pieces are refused: a piece rolls only through its set (`armor_set_odds.csv`) |
| `added_armor.csv` | `copies` names the piece whose locations it shares; empty means found nowhere, which counts everywhere |
| `armor_sets.csv` | a set with no pieces is one row with an empty `piece` |
| `boss_slot_links.csv`, `placement_areas.csv` | several rows for one item and area give it one row per boss or area; any one counts |
| `aliases.csv` | `members` are selectors, never name matches; an item in two aliases stops the build |
| `combat_rules.csv` | a rule has no description: its name says the whole rule |
| `wiki_urls.csv` | the Fextralife page a name doesn't reach, and each alias's group page; an empty `url` means no link (`data/sources/README.md#Wiki lookups`) |

## Regions

Regions are the player's only progression input: ticking one says its content is reachable. A place belongs to the region where the player physically enters it, and regions never mix content split by a hard story gate. The boundaries that are not obvious, and the reasons `region_areas.csv` has no column for:

| Boundary | Why |
|---|---|
| Roundtable Hold → Limgrave | reachable from the start. Enia's remembrance and boss-armor sales are the exception: they take the boss's location |
| Smoldering Church → Limgrave | reached from Limgrave, though the map label says Caelid |
| Mohgwyn → Liurnia | Varré gives the medal in Liurnia |
| Four Belfries destinations → Liurnia | reached only through the Liurnia portals: the Chapel of Anticipation return, the Siofra ledge, the Farum Azula debris |
| Ainsel Downstream → Liurnia | the same early underground access as the Academy |
| Nokstella, Lake of Rot, Moonlight Altar → one region | one chain, Ranni's quest to Astel |
| Royal Capital ≠ Ashen Capital | the only exclusivity modelled. The Shunning-Grounds (`sewer`, `sewer_flame`, `sewer_catacombs`) stay reachable from the Ashen Capital, so both names say so; their rows stay in the Royal Capital's region and the engine holds the exception |
| Radahn, War-Dead Catacombs → Caelid | where they are; visiting Altus only starts the festival |
| Metyr's arena → Scadu Altus | Finger Birthing Grounds opens inside the cathedral |
| Rellana is not a gate | Gravesite and Scadu Altus are one region |
| Jori → Shadow Keep region | he guards the Abyssal Woods and is not inside them |
| Charo with Jagged Peak | one access path, one level band |
| Enir-Ilim alone | needs the Rauh Ruins seal burned |

Entry gates, for reference; nothing reads them:

| Region | Gate |
|---|---|
| Limgrave, Weeping Peninsula & Siofra | start |
| Liurnia, Mohgwyn & Ainsel Downstream | Stormveil, or the broken-bridge skip |
| Caelid & Dragonbarrow | none |
| Altus Plateau & Mt. Gelmir | Dectus Lift, or Rya's invite |
| Nokron & Deeproot Depths | Radahn, then the Mimic Tear |
| Ainsel Main, Nokstella, Lake of Rot & Moonlight Altar | the Deeproot coffin, or Ranni's quest |
| Leyndell, Royal Capital & Shunning-Grounds | 2 Great Runes |
| Mountaintops of the Giants | Morgott and the Rold Medallion |
| Crumbling Farum Azula | Fire Giant |
| Consecrated Snowfield | both halves of the Haligtree Secret Medallion |
| Miquella's Haligtree | the Ordina portal |
| Leyndell, Ashen Capital & Shunning-Grounds | Maliketh |
| DLC: Gravesite Plain, Scadu Altus & Rauh Base | the DLC entry, after Mohg |
| DLC: Shadow Keep, Storehouse & Rauh Ruins | the Golden Hippo, or the long backdoor walk |
| DLC: Jagged Peak & Charo | Ancient Dragon Man |
| DLC: Abyssal Woods & Midra's Manse | Jori, Elder Inquisitor |
| DLC: Enir-Ilim | Rauh Ruins, and the seal burned |

## Selectors and modifiers

A **selector cell** holds `kind:id id` parts split by `;`. A part with no ids means every option of that kind (`rule:`). A cell may name a subcategory group (`melee`, `paired`, `unpaired`, `ranged`, `catalyst`, `shield`, from `pipeline/eldenroll/model/vocabulary.py`); the stored selector is the expanded list. Every selector must match at least one item.

A **modifier** row is `id`, `when`, `target`, `value`:

- `when` holds at least one condition, split by `;` and ANDed: `rule_1=rule:parry_only` when a slot rolled a match, `rh!=subcategory:melee` when it rolled something that doesn't, `character_class=sorcerer jester` for a class. What always holds is base odds, on the option's own row, never a modifier.
- A `boss=` condition reads the objective's boss, which rolls before every slot; a region id in it, such as `boss=boss:limgrave`, stands for every boss fought in that region.
- `target` is one selector; `value` multiplies it, and `0` removes it.
- A condition reads one slot, so a rule about either hand or either talisman is two rows.
- Rows combine by multiplying: every row whose conditions hold applies once to each option it targets, so two true rows on one option compound. A `0` can't be revived by any other row, and a row whose target is already filtered out does nothing.
- A rule exclusion is written both ways, and a target must roll after its conditions, or the build fails.
- A value is a guarantee tier (`data/balance.md#Tiers`) or `0`. `×67`, `×6`, `×5`, `×3.5`, `×3` and `×0.5` are off-tier on purpose, until the simulation tunes them.

## Gaps

A gap is a source fact the build can't use as it stands: no stat record, a blank, all-zero or contradictory one, an ash or weapon class the ash sheet lacks, a weapon the unique-skill sheet can't settle, a remembrance whose boss nothing names. The checks in `pipeline/eldenroll/validate/gaps.py` find them, and the build fails on any gap its override file doesn't answer: `requirements.csv`, `infusable.csv`, `ash_compatibility.csv` or `remembrance_bosses.csv`. `python -m eldenroll.validate.gaps`, from `pipeline/`, lists the unanswered ones.

A check can't see a wrong value that looks normal. Such a doubt is tracked as an open question until it is answered, and the answer lands here as an override row with its reason.
