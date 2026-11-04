"""The structure half of the Phase 0 gate (`data.md` §11).

Each check returns its problems, naming the rows that fail, so one run reports them all. The checks
written earlier raise instead, so `_caught` turns their error into a problem.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Iterable, Iterator, Mapping
from typing import Final

from eldenrando.build.bosses import DLC_TAG, boss_pairs
from eldenrando.build.serialize import TABLE_FIELDS, database_rows
from eldenrando.errors import BuildError
from eldenrando.model.database import Database
from eldenrando.model.item import Item
from eldenrando.model.modifier import Modifier
from eldenrando.model.selector import Selector
from eldenrando.model.vocabulary import ARMOR_SLOTS, NO_STR_BONUS, SUBCATEGORIES
from eldenrando.validate.ash_compatibility import infusable_without_ashes
from eldenrando.validate.gate_data import GateData
from eldenrando.validate.modifiers import validate_modifiers, validate_rolling_order
from eldenrando.validate.regions import validate_region_dlc_prefix, validate_region_membership
from eldenrando.validate.selectors import known_ids, resolve_items
from eldenrando.validate.slot_pools import validate_slot_pools
from eldenrando.validate.subcategories import validate_subcategories

GRAFTED_DRAGON: Final[str] = "grafted_dragon"
NONE_RULE: Final[str] = "none"
NONE_RULE_ODDS: Final[float] = 4
BOSS_ROWS: Final[int] = 229
ROLLABLE_BOSSES: Final[int] = 218
BASE_BOSSES: Final[int] = 166
DLC_BOSSES: Final[int] = 52
# A guarantee is a boost or above. Lower values such as the same-class x67 are tuned by hand at the
# simulation, off the tier table on purpose, so spacing does not apply to them (`prd.md` §8.5).
LOWEST_GUARANTEE: Final[float] = 100
GUARANTEE_SPACING: Final[float] = 10
TOP_TIER: Final[float] = 1_000_000


def structure_problems(data: GateData) -> tuple[str, ...]:
    """Return every structural problem; an empty result means this half of the gate holds."""
    database = data.database
    known = known_ids(
        database.items, database.armor_sets, database.bosses, (row.id for row in database.rules)
    )
    return (
        *_caught(lambda: validate_subcategories(database.items)),
        *_caught(lambda: validate_slot_pools(database.slot_pools, database.items, known)),
        *_caught(lambda: validate_modifiers(database.modifiers, known)),
        *_caught(
            lambda: validate_rolling_order(database.modifiers, database.slot_pools, database.items)
        ),
        *_caught(lambda: validate_region_membership(database.regions, database.locations)),
        *_caught(
            lambda: validate_region_dlc_prefix(
                database.regions, database.locations, dlc_location_ids=data.dlc_locations
            )
        ),
        *_table_shape(database),
        *_unique_ids(database),
        *_none_row(database.items),
        *_requirements(database.items),
        *_odds(database),
        *_weapon_flags(database.items),
        *_str_bonus(database.items, data.str_bonus),
        *_ash_rows(database),
        *_region_levels(database),
        *_bosses(data),
        *_placement(database),
        *_armor_sets(database),
        *_aliases(database),
        *_modifier_values(database.modifiers),
        *_guarantee_spacing(database.modifiers, database.items),
    )


def several_top_tiers(
    modifiers: Iterable[Modifier], items: Iterable[Item]
) -> dict[str, tuple[str, ...]]:
    """Return each pool with several top-tier targets, to report, not reject (`prd.md` §8.5)."""
    table = tuple(items)
    targets: dict[str, set[str]] = {}
    for row in modifiers:
        if row.value == TOP_TIER:
            for pool in _pools_of(row.target, table):
                targets.setdefault(pool, set()).update(row.target.ids or ())
    return {pool: tuple(sorted(ids)) for pool, ids in sorted(targets.items()) if len(ids) > 1}


def _caught(check: Callable[[], None]) -> tuple[str, ...]:
    """Return the message of a check that raises, or nothing when it passes."""
    try:
        check()
    except BuildError as error:
        return (str(error),)
    return ()


def _table_shape(database: Database) -> Iterator[str]:
    """Yield each table or row whose fields differ from `data.md` §2."""
    rows = database_rows(database)
    if set(rows) != set(TABLE_FIELDS):
        yield f"tables differ from data.md: {', '.join(sorted(set(rows) ^ set(TABLE_FIELDS)))}"
    for table, fields in TABLE_FIELDS.items():
        for row in rows.get(table, ()):
            if tuple(row) != fields:
                yield f"{table} row has the fields {', '.join(row)}"
                break


def _unique_ids(database: Database) -> Iterator[str]:
    """Yield each table with a repeated or empty id or name."""
    tables: tuple[tuple[str, tuple[tuple[str, str], ...]], ...] = (
        ("region", tuple((row.id, row.name) for row in database.regions)),
        ("location", tuple((row.id, row.name) for row in database.locations)),
        ("boss_instance", tuple((row.id, row.name) for row in database.bosses)),
        ("item", tuple((row.id, row.name) for row in database.items)),
        ("armor_set", tuple((row.id, row.name) for row in database.armor_sets)),
        ("combat_rule", tuple((row.id, row.name) for row in database.rules)),
        ("build", tuple((row.id, row.name) for row in database.builds)),
        ("alias", tuple((row.id, row.label) for row in database.aliases)),
        ("modifier", tuple((row.id, row.id) for row in database.modifiers)),
    )
    for table, rows in tables:
        counts = Counter(row_id for row_id, _ in rows)
        repeated = sorted(row_id for row_id, count in counts.items() if count > 1)
        if repeated:
            yield f"{table} repeats the id: {', '.join(repeated)}"
        empty = sorted(row_id or "(no id)" for row_id, name in rows if not row_id or not name)
        if empty:
            yield f"{table} has an empty id or name on: {', '.join(empty)}"


def _none_row(items: Iterable[Item]) -> Iterator[str]:
    """Yield a problem unless exactly one item has the category `none`."""
    found = [item.id for item in items if item.category == "none"]
    if len(found) != 1:
        yield f"expected one none row, found: {', '.join(found) or 'nothing'}"


def _requirements(items: Iterable[Item]) -> Iterator[str]:
    """Yield the items whose five requirements are not whole numbers from 0."""
    bad = sorted(
        item.id
        for item in items
        if not all(
            type(value) is int and value >= 0
            for value in (item.req_str, item.req_dex, item.req_int, item.req_fth, item.req_arc)
        )
    )
    if bad:
        yield f"bad requirements on: {', '.join(bad)}"


def _odds(database: Database) -> Iterator[str]:
    """Yield what breaks the odds rules: below 0, `None` not at 4, or odds on an armor piece."""
    rows: tuple[tuple[str, float], ...] = (
        *((f"build {row.id}", row.odds) for row in database.builds),
        *((f"boss {row.id}", row.odds) for row in database.bosses),
        *((f"item {row.id}", row.odds) for row in database.items),
        *((f"rule {row.id}", row.odds) for row in database.rules),
        *((f"armor set {row.id}", row.odds) for row in database.armor_sets),
    )
    negative = sorted(name for name, odds in rows if odds < 0)
    if negative:
        yield f"odds below 0 on: {', '.join(negative)}"
    if [row.odds for row in database.rules if row.id == NONE_RULE] != [NONE_RULE_ODDS]:
        yield f"the rule None needs odds of {NONE_RULE_ODDS}"
    pieces = sorted(row.id for row in database.items if row.category == "armor" and row.odds != 1)
    if pieces:
        yield f"odds on armor pieces, which roll only through a set: {', '.join(pieces)}"


def _weapon_flags(items: Iterable[Item]) -> Iterator[str]:
    """Yield the items whose flags are not boolean on weapons and shields, and null elsewhere."""
    bad: list[str] = []
    for item in items:
        if item.category in ("weapon", "shield"):
            valid = isinstance(item.infusable, bool) and isinstance(item.str_bonus_2h, bool)
        elif item.category == "none":
            valid = item.infusable is None and item.str_bonus_2h is False
        else:
            valid = item.infusable is None and item.str_bonus_2h is None
        if not valid:
            bad.append(item.id)
    if bad:
        yield f"bad infusable or str_bonus_2h on: {', '.join(sorted(bad))}"


def _str_bonus(items: Iterable[Item], overrides: Mapping[str, bool]) -> Iterator[str]:
    """Yield the weapons whose two-handed bonus breaks the class rule with no override for it."""
    rows = [item for item in items if item.category in ("weapon", "shield")]
    without = sorted(
        item.id
        for item in rows
        if item.str_bonus_2h is False
        and item.subcategory not in NO_STR_BONUS
        and item.name not in overrides
    )
    if without:
        yield f"no two-handed bonus, but no class or override says so: {', '.join(without)}"
    keeps = sorted(
        item.id
        for item in rows
        if item.subcategory in NO_STR_BONUS and item.str_bonus_2h and item.id != GRAFTED_DRAGON
    )
    if keeps:
        yield f"two-handed bonus in a class without it: {', '.join(keeps)}"


def _ash_rows(database: Database) -> Iterator[str]:
    """Yield what breaks the ash rows.

    `infusable = false` means no ash whatever a class row says, so only its opposite is a check:
    an item that can hold an ash must have one to hold.
    """
    missing = infusable_without_ashes(database.items, database.ash_compatibility)
    if missing:
        yield f"can hold an ash, but none fits: {', '.join(sorted(item.id for item in missing))}"
    ashes = {item.id for item in database.items if item.category == "ash"}
    rows = database.ash_compatibility
    broad = {(row.ash_id, row.category) for row in rows if row.subcategory is None}
    for row in rows:
        where = f"{row.ash_id} on {row.category}: {row.subcategory}"
        if row.ash_id not in ashes:
            yield f"ash row names no ash: {where}"
        if row.subcategory is not None:
            if row.subcategory not in SUBCATEGORIES.get(row.category, frozenset[str]()):
                yield f"ash row's class is not in its category: {where}"
            if (row.ash_id, row.category) in broad:
                yield f"ash row is covered by a broader one: {where}"


def _region_levels(database: Database) -> Iterator[str]:
    """Yield a problem unless `region_level` is unique and strictly ascending."""
    levels = [row.region_level for row in database.regions]
    if levels != sorted(set(levels)):
        yield f"region_level is not unique and ascending: {levels}"


def _bosses(data: GateData) -> Iterator[str]:
    """Yield what breaks the boss table, including the arithmetic of `data.md` §6.1."""
    bosses = data.database.bosses
    overrides = data.boss_overrides
    fights = Counter(
        (instance_label or label, name)
        for (label, _), (name, instance_label) in overrides.merges.items()
    )
    expected = (
        len(boss_pairs(data.boss_rows))
        - sum(count - 1 for count in fights.values())
        + len(overrides.additions)
    )
    if len(bosses) != expected:
        yield f"{len(bosses)} boss rows, but the CSV, merges and additions give {expected}"
    if len(bosses) != BOSS_ROWS:
        yield f"{len(bosses)} boss rows, expected {BOSS_ROWS}"
    locations = {row.id: row.region_id for row in data.database.locations}
    dlc = {row.id for row in data.database.regions if row.is_dlc}
    rollable = [row for row in bosses if row.odds > 0]
    in_dlc = sum(1 for row in rollable if locations.get(row.location_id) in dlc)
    if (len(rollable), len(rollable) - in_dlc, in_dlc) != (
        ROLLABLE_BOSSES,
        BASE_BOSSES,
        DLC_BOSSES,
    ):
        yield f"{len(rollable)} rollable bosses, {in_dlc} of them DLC"
    additions = {(name, label): location for name, label, location in overrides.additions}
    for row in bosses:
        # A merge may move a fight to a label of its own, so the labels it came from count too.
        labels = {
            row.location_label,
            f"{DLC_TAG}{row.location_label}",
            *(
                label
                for (label, _), (name, instance_label) in overrides.merges.items()
                if name == row.name and instance_label.removeprefix(DLC_TAG) == row.location_label
            ),
        }
        found = {additions.get((row.name, row.location_label))}
        for label in labels:
            found |= {
                overrides.aliases.get(label),
                overrides.locations.get((row.name, label)),
            }
        if row.location_id not in locations or row.location_id not in found:
            yield f"boss {row.id} is at {row.location_id}, which its label does not resolve to"
    pairs = Counter((row.name, row.location_label) for row in bosses)
    repeated = sorted(f"{name} at {label}" for (name, label), count in pairs.items() if count > 1)
    if repeated:
        yield f"bosses repeat a name and label: {', '.join(repeated)}"


def _placement(database: Database) -> Iterator[str]:
    """Yield what breaks the location rows: an unknown id, or an item with or without rows."""
    items = {row.id: row for row in database.items}
    locations = {row.id for row in database.locations}
    bosses = {row.id for row in database.bosses}
    placed: set[str] = set()
    for row in database.item_locations:
        placed.add(row.item_id)
        if row.item_id not in items:
            yield f"location row names no item: {row.item_id}"
        if row.location_id is not None and row.location_id not in locations:
            yield f"{row.item_id} has a row at no location: {row.location_id}"
        if row.boss_instance_id is not None and row.boss_instance_id not in bosses:
            yield f"{row.item_id} has a row at no boss: {row.boss_instance_id}"
    exempt = {"consumable", "none"}
    missing = sorted(
        row.id for row in database.items if row.category not in exempt and row.id not in placed
    )
    if missing:
        yield f"no location row: {', '.join(missing)}"
    extra = sorted(
        row.id for row in database.items if row.category in exempt and row.id in placed
    )
    if extra:
        yield f"location rows on what has none by design: {', '.join(extra)}"


def _armor_sets(database: Database) -> Iterator[str]:
    """Yield the sets with too many pieces, a repeat, an unknown id, or two pieces in one slot."""
    slots = {row.id: row.subcategory for row in database.items if row.category == "armor"}
    for row in database.armor_sets:
        unknown = sorted(set(row.pieces) - set(slots))
        if unknown:
            yield f"set {row.id} names no armor piece: {', '.join(unknown)}"
        worn = [slots[piece] for piece in row.pieces if piece in slots]
        if len(row.pieces) > len(ARMOR_SLOTS) or len(set(worn)) != len(worn):
            yield f"set {row.id} needs at most one piece per slot: {', '.join(row.pieces)}"
        if len(set(row.pieces)) != len(row.pieces):
            yield f"set {row.id} repeats a piece: {', '.join(row.pieces)}"


def _aliases(database: Database) -> Iterator[str]:
    """Yield each alias with no member, and each item whose alias does not exist."""
    known = {row.id for row in database.aliases}
    used = {item.alias for item in database.items if item.alias is not None}
    if known - used:
        yield f"alias with no member: {', '.join(sorted(known - used))}"
    if used - known:
        yield f"item names no alias: {', '.join(sorted(used - known))}"


def _modifier_values(modifiers: Iterable[Modifier]) -> Iterator[str]:
    """Yield the modifiers with a value below 0."""
    bad = sorted(row.id for row in modifiers if row.value < 0)
    if bad:
        yield f"modifier value below 0: {', '.join(bad)}"


def _guarantee_spacing(modifiers: Iterable[Modifier], items: Iterable[Item]) -> Iterator[str]:
    """Yield each pool whose highest guarantee is under 10 times the next (`prd.md` §8.5)."""
    table = tuple(items)
    values: dict[str, set[float]] = {}
    for row in modifiers:
        if row.value >= LOWEST_GUARANTEE:
            for pool in _pools_of(row.target, table):
                values.setdefault(pool, set()).add(row.value)
    for pool, found in sorted(values.items()):
        ordered = sorted(found, reverse=True)
        if len(ordered) > 1 and ordered[0] < GUARANTEE_SPACING * ordered[1]:
            yield f"guarantees too close in the {pool} pool: {ordered[0]} and {ordered[1]}"


def _pools_of(target: Selector, items: tuple[Item, ...]) -> tuple[str, ...]:
    """Return the pools a target competes in: rules, armor sets, or an item category."""
    if target.kind in ("rule", "armor_set"):
        return (target.kind,)
    return tuple(sorted({item.category for item in resolve_items((target,), items)}))
