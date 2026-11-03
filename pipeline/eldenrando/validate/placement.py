"""Check and report where items are found (`tasklist.md` 2.8.7, `prd.md` §8.3).

Run `python -m eldenrando.validate.placement` from `pipeline/` to print the coverage, the split by
source, the items per boss and the counts per region. The report is for reading, never blocking;
`tests/test_placement.py` holds what must stay true.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Collection, Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

from eldenrando.build.armor_sets import build_armor_sets
from eldenrando.build.boss_table import load_boss_overrides, load_boss_rows
from eldenrando.build.bosses import build_boss_instances
from eldenrando.build.placement import (
    Placement,
    PlacementKind,
    PlacementSources,
    build_placements,
    item_locations,
    merged_labels,
)
from eldenrando.loaders.armor_sets import load_armor_sets
from eldenrando.loaders.boss_links import (
    load_armor_shop_bosses,
    load_remembrance_bosses,
    load_slot_links,
)
from eldenrando.loaders.drops import load_drop_locations, load_item_drops
from eldenrando.loaders.region_areas import load_region_areas
from eldenrando.loaders.regions import load_regions
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.boss_instance import BossInstance
from eldenrando.model.item import Item
from eldenrando.model.item_location import ItemLocation
from eldenrando.model.region import DLC_PREFIX, Region
from eldenrando.normalize.placement_names import placement_names
from eldenrando.paths import ENEMY_DROPS, ENEMY_ITEM_LOTS
from eldenrando.validate.gaps import GapSources, load_sources

ROYAL_CAPITAL = "leyndell"
ASHEN_CAPITAL = "leyndell_ashen"
_KINDS: tuple[PlacementKind, ...] = ("boss", "enemy", "direct")
_CATEGORIES = ("weapon", "shield", "armor", "talisman", "ash", "sorcery", "incantation", "tool")


@dataclass(frozen=True, slots=True)
class PlacementData:
    """What the report reads, already built."""

    table: tuple[Item, ...]
    placements: tuple[Placement, ...]
    bosses: tuple[BossInstance, ...]
    regions: tuple[Region, ...]
    region_of_location: Mapping[str, str]
    armor_sets: tuple[ArmorSet, ...]


def needs_location(item: Item) -> bool:
    """Return whether an item must have a row: every one but consumables and `none`."""
    return item.category not in ("consumable", "none")


def effective_regions(selected: Collection[str]) -> frozenset[str]:
    """Return the regions that count: the Ashen Capital replaces the Royal one (`prd.md` §3.2)."""
    regions = frozenset(selected)
    return regions - {ROYAL_CAPITAL} if ASHEN_CAPITAL in regions else regions


def row_counts(
    row: ItemLocation,
    selected: Collection[str],
    dead: Collection[str],
    bosses: Mapping[str, BossInstance],
    region_of_location: Mapping[str, str],
    *,
    boss_items_only_from_dead: bool = True,
) -> bool:
    """Return whether one row makes its item eligible, by the table in `prd.md` §8.3."""
    if row.location_id is not None:
        return region_of_location[row.location_id] in selected
    boss = bosses[str(row.boss_instance_id)]
    if boss_items_only_from_dead and boss.odds > 0:
        return boss.id in dead
    return region_of_location[boss.location_id] in selected


def eligible_items(
    rows: Iterable[ItemLocation],
    selected: Collection[str],
    dead: Collection[str],
    bosses: Mapping[str, BossInstance],
    region_of_location: Mapping[str, str],
) -> frozenset[str]:
    """Return the ids of the items with at least one row that counts."""
    regions = effective_regions(selected)
    return frozenset(
        row.item_id for row in rows if row_counts(row, regions, dead, bosses, region_of_location)
    )


def eligible_sets(sets: Iterable[ArmorSet], items: Collection[str]) -> tuple[ArmorSet, ...]:
    """Return the sets whose every piece is reachable; a set short a piece is not filtered."""
    return tuple(row for row in sets if all(piece in items for piece in row.pieces))


def load_placement_data(root: Path, sources: GapSources | None = None) -> PlacementData:
    """Return the placement tables, from `data/sources/` and a checkout's `data/overrides/`."""
    overrides = root / "data" / "overrides"
    loaded = load_sources(root) if sources is None else sources
    boss_overrides = load_boss_overrides(overrides)
    bosses = build_boss_instances(load_boss_rows(), boss_overrides)
    regions = load_regions(overrides / "regions.csv")
    placements = build_placements(
        PlacementSources(
            names=placement_names(loaded.table, loaded.catalog, loaded.variants),
            slots=loaded.slots,
            drops=load_drop_locations(ENEMY_DROPS),
            lots=load_item_drops(ENEMY_ITEM_LOTS),
            bosses=bosses,
            merged_labels=merged_labels(boss_overrides.merges),
            aliases=boss_overrides.aliases,
            remembrances=load_remembrance_bosses(overrides / "remembrance_bosses.csv"),
            armor_shops=load_armor_shop_bosses(overrides / "boss_armor_shops.csv"),
            slot_links=load_slot_links(overrides / "boss_slot_links.csv"),
            ash_sources=loaded.ash_sources,
        )
    )
    return PlacementData(
        table=loaded.table,
        placements=placements,
        bosses=bosses,
        regions=regions,
        region_of_location=load_region_areas(
            overrides / "region_areas.csv", region_ids={region.id for region in regions}
        ),
        armor_sets=build_armor_sets(load_armor_sets(overrides / "armor_sets.csv"), loaded.table),
    )


def kinds_by_item(placements: Iterable[Placement]) -> dict[str, set[PlacementKind]]:
    """Return the kinds of source each item has."""
    out: dict[str, set[PlacementKind]] = {}
    for placement in placements:
        out.setdefault(placement.row.item_id, set()).add(placement.kind)
    return out


def coverage_lines(data: PlacementData) -> list[str]:
    """Return how many items have a row, by category and by kind of source."""
    kinds = kinds_by_item(data.placements)
    wanted = [item for item in data.table if needs_location(item)]
    missing = sorted(item.name for item in wanted if item.id not in kinds)
    lines = [f"Items with a location: {len(wanted) - len(missing)} / {len(wanted)}"]
    if missing:
        lines.append(f"  MISSING: {', '.join(missing)}")
    lines += [
        "",
        "Items by source: counted under each source they have, then by their only source",
        f"{'category':<13}{'items':>6}{'boss':>6}{'enemy':>7}{'direct':>8}"
        f"{'only boss':>11}{'only enemy':>12}{'only direct':>13}{'several':>9}",
    ]
    for category in (*_CATEGORIES, "all"):
        items = [item for item in wanted if category in ("all", item.category)]
        has = Counter(kind for item in items for kind in kinds.get(item.id, ()))
        only = Counter(
            next(iter(kinds[item.id])) if len(kinds[item.id]) == 1 else "several"
            for item in items
            if item.id in kinds
        )
        lines.append(
            f"{category:<13}{len(items):>6}{has['boss']:>6}{has['enemy']:>7}{has['direct']:>8}"
            f"{only['boss']:>11}{only['enemy']:>12}{only['direct']:>13}{only['several']:>9}"
        )
    rows = Counter(kind for _, kind in _rows_with_kind(data.placements))
    lines += ["", "Rows: " + ", ".join(f"{kind} {rows[kind]}" for kind in _KINDS)]
    return lines


def _rows_with_kind(placements: Iterable[Placement]) -> set[tuple[ItemLocation, PlacementKind]]:
    """Return each row with the kinds that gave it, so two lines for one row count once."""
    return {(placement.row, placement.kind) for placement in placements}


def boss_lines(data: PlacementData) -> list[str]:
    """Return how the items spread over the bosses."""
    items_of: dict[str, set[str]] = {}
    for placement in data.placements:
        if placement.row.boss_instance_id is not None:
            items_of.setdefault(placement.row.boss_instance_id, set()).add(placement.row.item_id)
    rollable = [boss for boss in data.bosses if boss.odds > 0]
    zero = [boss for boss in data.bosses if boss.odds == 0]
    with_items = [boss for boss in rollable if boss.id in items_of]
    counts = sorted(len(items_of[boss.id]) for boss in with_items)
    busiest = sorted(with_items, key=lambda boss: (-len(items_of[boss.id]), boss.name))[:8]
    no_items = sorted(f"{b.name} ({b.location_label})" for b in zero if b.id not in items_of)
    lines = [
        f"Boss rows: {len(data.bosses)} ({len(rollable)} can roll, {len(zero)} at odds 0)",
        f"Bosses that can roll with a tied item: {len(with_items)}; with none: "
        f"{len(rollable) - len(with_items)}",
        f"Items per boss with any: median {counts[len(counts) // 2]}, most {counts[-1]}",
        "Most items: " + "; ".join(f"{b.name} {len(items_of[b.id])}" for b in busiest),
    ]
    if no_items:
        lines.append(f"ODDS-0 BOSS WITH NO ITEM: {'; '.join(no_items)}")
    return lines


def region_lines(data: PlacementData) -> list[str]:
    """Return the rows per region, and what each region alone can roll."""
    bosses = {boss.id: boss for boss in data.bosses}
    region_of = data.region_of_location
    rows_per: Counter[tuple[str, PlacementKind]] = Counter()
    for row, kind in _rows_with_kind(data.placements):
        location = row.location_id or bosses[str(row.boss_instance_id)].location_id
        rows_per[(region_of[location], kind)] += 1
    bosses_per = Counter(region_of[boss.location_id] for boss in data.bosses if boss.odds > 0)
    rows = item_locations(data.placements)
    lines = [
        "Rows per region, and what the region alone can roll, with no boss dead / its bosses dead",
        f"{'lvl':>4} {'region':<48}{'bosses':>7}{'boss':>6}{'enemy':>7}{'direct':>8}"
        f"{'items':>7}{'+dead':>7}{'sets':>6}{'+dead':>7}",
    ]
    for region in data.regions:
        dead = {boss.id for boss in data.bosses if region_of[boss.location_id] == region.id}
        alive_items = eligible_items(rows, {region.id}, (), bosses, region_of)
        dead_items = eligible_items(rows, {region.id}, dead, bosses, region_of)
        lines.append(
            f"{region.region_level:>4} {region.name[:47]:<48}{bosses_per[region.id]:>7}"
            f"{rows_per[(region.id, 'boss')]:>6}{rows_per[(region.id, 'enemy')]:>7}"
            f"{rows_per[(region.id, 'direct')]:>8}{len(alive_items):>7}{len(dead_items):>7}"
            f"{len(eligible_sets(data.armor_sets, alive_items)):>6}"
            f"{len(eligible_sets(data.armor_sets, dead_items)):>7}"
        )
    return lines


def _of_category(category: str) -> Callable[[Item], bool]:
    """Return a test for one category."""
    return lambda item: item.category == category


def _of_subcategory(subcategory: str) -> Callable[[Item], bool]:
    """Return a test for one subcategory."""
    return lambda item: item.subcategory == subcategory


_CUMULATIVE_COLUMNS: tuple[tuple[str, Callable[[Item], bool]], ...] = (
    ("weapons", _of_category("weapon")),
    ("shields", _of_category("shield")),
    ("talismans", _of_category("talisman")),
    ("ashes", _of_category("ash")),
    ("sorceries", _of_category("sorcery")),
    ("incantations", _of_category("incantation")),
    ("tools", _of_category("tool")),
    ("staves", _of_subcategory("glintstone_staff")),
    ("seals", _of_subcategory("sacred_seal")),
)


def cumulative_lines(data: PlacementData) -> list[str]:
    """Return what can roll as regions are added in level order, for three states of the bosses."""
    bosses = {boss.id: boss for boss in data.bosses}
    region_of = data.region_of_location
    rows = item_locations(data.placements)
    every_boss = {boss.id for boss in data.bosses}
    header = "".join(f"{name:>15}" for name, _ in _CUMULATIVE_COLUMNS)
    lines = [
        "Cumulative in level order: no boss dead / the selected regions' bosses dead / all dead",
        f"{'up to':<28}{'armor sets':>15}{header}",
    ]
    selected: list[str] = []
    for region in data.regions:
        selected.append(region.id)
        in_selected = {
            boss.id for boss in data.bosses if region_of[boss.location_id] in set(selected)
        }
        states = [
            eligible_items(rows, selected, dead, bosses, region_of)
            for dead in ((), in_selected, every_boss)
        ]
        sets = "/".join(str(len(eligible_sets(data.armor_sets, state))) for state in states)
        cells = "".join(
            "{:>15}".format(
                "/".join(
                    str(sum(1 for item in data.table if item.id in state and wanted(item)))
                    for state in states
                )
            )
            for _, wanted in _CUMULATIVE_COLUMNS
        )
        lines.append(f"{region.name.removeprefix(DLC_PREFIX)[:27]:<28}{sets:>15}{cells}")
    return lines


def main() -> None:
    """Print the report."""
    data = load_placement_data(Path(__file__).resolve().parents[3])
    for section in (coverage_lines, boss_lines, region_lines, cumulative_lines):
        print("\n".join(section(data)))
        print()


if __name__ == "__main__":
    main()
