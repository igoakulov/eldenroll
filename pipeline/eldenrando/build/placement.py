"""Where each item is found: `item_location` rows from the slots and drop CSVs (`data.md` §5).

A slot line places its item at the slot's `Area`, unless the item comes from a fight. A boss-tagged
slot joins on its map label, because the mod often names an enemy by its model: the name decides
only where a label holds several bosses. Enia's items take the boss their remembrance or unlock
names. `boss_slot_links.csv` ties what no tag shows, such as the fights at `odds = 0`, and every
row of it must apply, so a source change that orphans one stops the build.

The drop CSVs add every regular enemy's farm spots. Last, an ash the mod has only on a weapon takes
that weapon's rows, boss-tied ones included.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass

from eldenrando.build.bosses import BOSS_TAG, DLC_TAG
from eldenrando.build.location_labels import NON_PLACE_LABELS
from eldenrando.errors import BuildError
from eldenrando.loaders.boss_links import BossPlace
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.loaders.itemslots import extract_items
from eldenrando.model.boss_instance import BossInstance
from eldenrando.model.item import Item
from eldenrando.model.item_location import ItemLocation
from eldenrando.model.item_slot import ItemSlot
from eldenrando.normalize.placement_names import PlacementNames

# The slots a fight fills. The mod's two boss shop tags are Enia's, whose lines name their boss.
BOSS_SLOT_TAGS = frozenset(
    {
        "altboss",
        "boss",
        "catacombboss",
        "caveboss",
        "cellarbosschest",
        "dragonboss",
        "gaolboss",
        "graveboss",
        "miniboss",
        "minidungeonboss",
        "miscboss",
        "overworldboss",
        "remembranceboss",
        "tunnelboss",
    }
)
BOSS_SHOP_TAGS = frozenset({"bossarmorshop", "bosssoulshop"})
ENIA = "Finger Reader Enia"
REMEMBRANCE = re.compile(r"for ((?:Elden )?Remembrance.*?)(?:, \d+ runes)? - flag")

_ROUNDTABLE = "roundtable"
_ROUNDTABLE_LOCATION = "limgrave"
_AFTER_DEFEATING = re.compile(r" - after defeating (.+)$")
_LABEL = re.compile(r" in m\d\d_\d\d_\d\d_\d\d \((.*?)\)(?:,|\])")
_ENEMY_NAMES = re.compile(r"enemy \w+ \((.*?) - id[^\[\]]*?(?:- \[(.*?)\])?\)")
_DROP_CELL = re.compile(r"^(.*?) - \{\d+\} \(")
_UPGRADE = re.compile(r" \+\d+$")
_DROP_LOCATION = "Location"
_DROP_NAME = "Name"
_DROP_CELLS = "Drop "
_LOT_LOCATION = "Location #1"
_LOT_NAME = "Name"
_LOT_CELLS = ("Items Drop ", "Item Drop ")
_NO_ITEM = "None"


@dataclass(frozen=True, slots=True)
class Placement:
    """One row with what gave it: `source_name` as the source wrote the item's name."""

    row: ItemLocation
    source_name: str


@dataclass(frozen=True, slots=True)
class PlacementSources:
    """What placement reads, already loaded."""

    names: PlacementNames
    slots: Sequence[ItemSlot]
    drops: CsvTable
    lots: CsvTable
    bosses: Sequence[BossInstance]
    merged_labels: Mapping[str, str]
    aliases: Mapping[str, str]
    remembrances: Mapping[str, BossPlace]
    armor_shops: Mapping[str, BossPlace]
    slot_links: Mapping[tuple[str, str], BossPlace]
    ash_sources: Mapping[str, Sequence[str]]


def merged_labels(merges: Mapping[tuple[str, str], tuple[str, str]]) -> dict[str, str]:
    """Return `{slot label: instance label}` for the fights a merge moved to a new label."""
    return {
        label.removeprefix(DLC_TAG): instance_label.removeprefix(DLC_TAG)
        for (label, _), (_, instance_label) in merges.items()
        if instance_label
    }


def build_placements(sources: PlacementSources) -> tuple[Placement, ...]:
    """Return every placement once, or raise `BuildError`."""
    placements = [*_slot_placements(sources), *_drop_placements(sources)]
    placements.extend(_ash_placements(sources, placements))
    return tuple(dict.fromkeys(placements))


def item_locations(placements: Iterable[Placement]) -> tuple[ItemLocation, ...]:
    """Return the distinct rows of the placements, in their order."""
    return tuple(dict.fromkeys(placement.row for placement in placements))


def _slot_placements(sources: PlacementSources) -> Iterator[Placement]:
    """Yield a placement per slot line that names a pool item."""
    places = {(boss.name, boss.location_label): boss for boss in sources.bosses}
    by_label: dict[str, list[BossInstance]] = {}
    for boss in sources.bosses:
        by_label.setdefault(boss.location_label, []).append(boss)
    linked: set[tuple[str, str]] = set()
    for slot in sources.slots:
        if not slot.is_randomizable:
            continue
        for line in slot.debug_lines:
            item = sources.names.resolve_slot_line(line)
            if item is None or item.category == "consumable":
                continue
            key = (item.name, slot.area)
            place = sources.slot_links.get(key)
            if place is not None:
                linked.add(key)
            elif ENIA in line:
                place = _enia_boss(line, sources)
            source_name = extract_items((line,))[0]
            if place is not None:
                yield _boss_placement(item, _boss_at(place, places), source_name)
            elif BOSS_SLOT_TAGS.intersection(slot.tags):
                boss = _boss_of_slot(slot, line, by_label, sources.merged_labels)
                yield _boss_placement(item, boss, source_name)
            else:
                yield _location_placement(item, slot.area, source_name)
    unused = sorted(f"{item} at {area}" for item, area in set(sources.slot_links) - linked)
    if unused:
        raise BuildError(f"boss_slot_links names no slot line: {', '.join(unused)}")


def _enia_boss(line: str, sources: PlacementSources) -> BossPlace:
    """Return the boss of an item Enia sells, or raise `BuildError`."""
    remembrance = REMEMBRANCE.search(line)
    if remembrance is not None:
        place = sources.remembrances.get(remembrance[1])
        if place is None:
            raise BuildError(f"remembrance_bosses has no row for {remembrance[1]!r}")
        return place
    defeated = _AFTER_DEFEATING.search(line)
    if defeated is None:
        raise BuildError(f"Enia's line names neither a remembrance nor a boss: {line!r}")
    place = sources.armor_shops.get(defeated[1])
    if place is None:
        raise BuildError(f"boss_armor_shops has no row for {defeated[1]!r}")
    return place


def _boss_at(place: BossPlace, places: Mapping[tuple[str, str], BossInstance]) -> BossInstance:
    """Return the instance a link names, or raise `BuildError`."""
    boss = places.get(place)
    if boss is None:
        raise BuildError(f"no boss instance {place[0]!r} on {place[1]!r}")
    return boss


def _boss_of_slot(
    slot: ItemSlot,
    line: str,
    by_label: Mapping[str, Sequence[BossInstance]],
    merged: Mapping[str, str],
) -> BossInstance:
    """Return the fight a boss-tagged slot line belongs to, or raise `BuildError`.

    A label a merge moved still holds its other fights, so it offers both sets of bosses.
    """
    written = _LABEL.findall(line)
    labels = {*written, *(merged[label] for label in written if label in merged)}
    bosses = [boss for label in sorted(labels) for boss in by_label.get(label, ())]
    if len(bosses) == 1:
        return bosses[0]
    enemies = {name for match in _ENEMY_NAMES.findall(line) for name in match if name}
    text = slot.text.casefold()
    named = [boss for boss in bosses if boss.name in enemies or boss.name.casefold() in text]
    if len(named) == 1:
        return named[0]
    choices = ", ".join(boss.name for boss in named or bosses) or "no boss"
    raise BuildError(f"{slot.text!r} at {slot.area}: label has {choices}, for {line!r}")


def _boss_placement(item: Item, boss: BossInstance, source_name: str) -> Placement:
    """Return a boss-tied placement."""
    row = ItemLocation(item_id=item.id, boss_instance_id=boss.id)
    return Placement(row=row, source_name=source_name)


def _location_placement(item: Item, area: str, source_name: str) -> Placement:
    """Return a placement at a location; the Roundtable counts as Limgrave (`data.md` §5.2)."""
    location_id = _ROUNDTABLE_LOCATION if area == _ROUNDTABLE else area
    row = ItemLocation(item_id=item.id, location_id=location_id)
    return Placement(row=row, source_name=source_name)


def _drop_placements(sources: PlacementSources) -> Iterator[Placement]:
    """Yield a placement per pool item a regular enemy drops, from both CSVs."""
    yield from _cell_placements(
        sources,
        sources.drops,
        _DROP_LOCATION,
        _DROP_NAME,
        _columns(sources.drops, (_DROP_CELLS,)),
        _drop_cell_name,
    )
    yield from _cell_placements(
        sources,
        sources.lots,
        _LOT_LOCATION,
        _LOT_NAME,
        _columns(sources.lots, _LOT_CELLS),
        _lot_cell_name,
    )


def _columns(table: CsvTable, prefixes: tuple[str, ...]) -> tuple[int, ...]:
    """Return the indexes of the columns that hold an item."""
    return tuple(
        index for index, name in enumerate(table.header) if name.startswith(prefixes)
    )


def _drop_cell_name(cell: str) -> str:
    """Return the name in a cell like `Kukri - {5} (10%) [True]`, or raise `BuildError`."""
    match = _DROP_CELL.match(cell)
    if match is None:
        raise BuildError(f"enemy_drops cell has no name: {cell!r}")
    return match[1]


def _lot_cell_name(cell: str) -> str:
    """Return the name in an item-lot cell, which holds nothing else."""
    return cell


def _cell_placements(
    sources: PlacementSources,
    table: CsvTable,
    location_column: str,
    name_column: str,
    cells: tuple[int, ...],
    cell_name: Callable[[str], str],
) -> Iterator[Placement]:
    """Yield a placement per pool item in one drop table, or raise `BuildError`."""
    location = table.column(location_column)
    enemy = table.column(name_column)
    for row in table.rows:
        label = row[location]
        for index in cells:
            if not row[index] or row[index] == _NO_ITEM:
                continue
            source_name = cell_name(row[index])
            item = sources.names.resolve(source_name)
            if item is None or item.category == "consumable" or label in NON_PLACE_LABELS:
                continue
            if BOSS_TAG in row[enemy]:
                raise BuildError(f"boss row {row[enemy]!r} on {label!r} drops {item.name!r}")
            area = sources.aliases.get(label)
            if area is None:
                raise BuildError(f"{item.name!r} drops on {label!r}, which has no alias")
            yield _location_placement(item, area, source_name)


def _ash_placements(
    sources: PlacementSources, placements: Sequence[Placement]
) -> Iterator[Placement]:
    """Yield the weapons' placements again for each ash that comes on them, or raise."""
    for ash_name, weapons in sources.ash_sources.items():
        ash = sources.names.ashes[ash_name]
        for weapon in weapons:
            found = _weapon_placements(sources, placements, weapon)
            if not found:
                raise BuildError(f"{ash_name!r} comes on {weapon!r}, which no source places")
            for placement in found:
                row = ItemLocation(
                    item_id=ash.id,
                    location_id=placement.row.location_id,
                    boss_instance_id=placement.row.boss_instance_id,
                )
                yield Placement(row=row, source_name=weapon)


def _weapon_placements(
    sources: PlacementSources, placements: Sequence[Placement], weapon: str
) -> list[Placement]:
    """Return a weapon's placements; a name with `+N` means only the copies written that way."""
    if _UPGRADE.search(weapon):
        return [placement for placement in placements if placement.source_name == weapon]
    item = sources.names.items.get(weapon)
    if item is None:
        raise BuildError(f"ash_sources names no weapon: {weapon!r}")
    return [placement for placement in placements if placement.row.item_id == item.id]
