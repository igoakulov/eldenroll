"""Find the data problems a check can see and hold `data/gaps.csv` to them (`data.md` §10).

Every gap a check finds must have a row, and a row whose gap has gone away must be closed, so
the list cannot drift from the sources. A problem no check can see, such as a wrong value that
looks normal, is a row a person added, and nothing here touches it.

Run `python -m eldenrando.validate.gaps` from `pipeline/` to add a row for every new gap.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from eldenrando.build.armor import build_armor
from eldenrando.build.ash_compatibility import build_ash_compatibility
from eldenrando.build.ashes import build_ashes
from eldenrando.build.consumables import build_consumables
from eldenrando.build.items import build_item_table, none_item
from eldenrando.build.spells import build_incantations, build_sorceries
from eldenrando.build.talismans import build_talismans
from eldenrando.build.tools import build_tools
from eldenrando.build.weapons import build_weapons
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.armor_slots import load_armor_slots
from eldenrando.loaders.ash_overrides import load_ash_overrides
from eldenrando.loaders.ash_sources import load_ash_sources
from eldenrando.loaders.consumables import load_consumable_categories
from eldenrando.loaders.csv_source import CsvTable, read_table
from eldenrando.loaders.gaps import load_gaps, write_gaps
from eldenrando.loaders.infusable import load_infusable
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.itemslots import load_slots
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.str_bonus import load_str_bonus
from eldenrando.loaders.weapons import (
    load_ash_compatibility,
    load_somber_weapons,
    load_weapon_categories,
)
from eldenrando.model.ash_compatibility import AshCompatibility
from eldenrando.model.gap import Gap, Origin, Owner
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.item_slot import ItemSlot
from eldenrando.model.name_variant import NameVariant
from eldenrando.normalize.armor_slots import assign_armor_slots
from eldenrando.normalize.infusable import assign_infusable
from eldenrando.normalize.placement_names import PlacementNames, placement_names
from eldenrando.normalize.str_bonus import assign_str_bonus

_STATS: Mapping[str, str] = {
    "str": "str",
    "strength": "str",
    "dex": "dex",
    "dexterity": "dex",
    "int": "int",
    "intelligence": "int",
    "fai": "fth",
    "faith": "fth",
    "arc": "arc",
    "arcane": "arc",
}
_ASH_SHEET_CLASSES: Mapping[str, str] = {"Staff": "glintstone_staff", "Seal": "sacred_seal"}
_ASH_SHEET_FIRST_CLASS = "Dagger"
_ASH_SHEET_NOT_A_CLASS = "NONE"
_JOINED_SHEET_NAMES: Mapping[str, tuple[str, ...]] = {
    "(Nightrider / Chainlink) Flail": ("Nightrider Flail", "Chainlink Flail"),
    "Staff of the Avatar / Rotten Staff": ("Staff of the Avatar", "Rotten Staff"),
}
_NEVER_ASKED_CLASSES = frozenset({"glintstone_staff", "sacred_seal", "perfume_bottle"})
_SKILL_SUFFIX = re.compile(r"\s*(\[.*|#.*|\(.*|R1.*|R2.*|- .*)$")
_UPGRADE = re.compile(r" \+\d+$")
_ENIA = "Finger Reader Enia"
_REMEMBRANCE = re.compile(r"for ((?:Elden )?Remembrance.*?)(?:, \d+ runes)? - flag")
_REQUIREMENT_FIELDS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("weapons", "requiredAttributes", ("weapon", "shield")),
    ("shields", "requiredAttributes", ("weapon", "shield")),
    ("sorceries", "requires", ("sorcery", "incantation")),
    ("incantations", "requires", ("sorcery", "incantation")),
)
_BASE_WITHOUT_AN_ID = frozenset({"Serpent-Hunter"})
_KINDS: Mapping[str, str] = {
    "weapon": "weapon",
    "shield": "weapon",
    "armor": "protector",
    "ash": "gem",
    "sorcery": "goods",
    "incantation": "goods",
    "tool": "goods",
}
# The override file that holds an area's applied answers; the first column names the item.
_OVERRIDE_FILES: Mapping[str, str] = {
    "requirements": "requirements.csv",
    "holds_ash": "infusable.csv",
    "ash_usable_on": "ash_compatibility.csv",
    "remembrance_boss": "remembrance_bosses.csv",
}


@dataclass(frozen=True, slots=True)
class GapSources:
    """What the checks read, already loaded."""

    table: tuple[Item, ...]
    catalog: ItemCatalog
    variants: Mapping[str, NameVariant]
    ash_sources: Mapping[str, tuple[str, ...]]
    ash_sheet: CsvTable
    ash_compatibility: tuple[AshCompatibility, ...]
    unique_skills: Mapping[str, tuple[str, ...]]
    requirement_records: Mapping[str, tuple[Mapping[str, object], ...]]
    slots: tuple[ItemSlot, ...]


def item_origin(item: Item, catalog: ItemCatalog, variants: Mapping[str, NameVariant]) -> Origin:
    """Return where an item comes from, by its group in the mod and its game id."""
    kind = _KINDS.get(item.category)
    if kind is None:
        return "base"
    item_id = _game_id(item, kind, catalog, variants)
    if item_id in catalog.groups["tarnished"].items.get(kind, ()):
        return "tarnished"
    if item_id is None:
        return "base" if item.name in _BASE_WITHOUT_AN_ID else "dlc"
    if kind == "weapon":
        return "dlc" if item_id >= 60_000_000 or item_id % 1_000_000 >= 500_000 else "base"
    limit = {"protector": 3_000_000, "gem": 200_000, "goods": 2_000_000}[kind]
    return "dlc" if item_id >= limit else "base"


def _game_id(
    item: Item, kind: str, catalog: ItemCatalog, variants: Mapping[str, NameVariant]
) -> int | None:
    """Return the item's id in the mod, or None when the mod has no id for it."""
    wanted = {item.name, f"Ash of War: {item.name}", f"{item.name} (Altered)"}
    for item_id, name in catalog.names[kind].items():
        variant = variants.get(str(item_id))
        if (name if variant is None else variant.canonical_name) in wanted:
            return item_id
    return None


def requirement_gaps(sources: GapSources) -> tuple[Gap, ...]:
    """Return a gap per item whose stat records are absent, unusable or in conflict."""
    names = {
        (item.category, item.name.casefold()): item
        for item in sources.table
        if item.category in ("weapon", "shield", "sorcery", "incantation")
    }
    found: dict[str, list[tuple[Mapping[str, object], str]]] = {}
    for document, field, categories in _REQUIREMENT_FIELDS:
        for record in sources.requirement_records[document]:
            variant = sources.variants.get(cast("str", record["id"]))
            name = cast("str", record["name"]) if variant is None else variant.canonical_name
            for category in categories:
                item = names.get((category, name.casefold()))
                if item is not None:
                    found.setdefault(item.name, []).append((record, field))
    out: list[Gap] = []
    for item in names.values():
        problem = _requirement_problem(found.get(item.name, []))
        if problem is not None:
            out.append(_gap("requirements", item, sources, problem, "2.5.3", "both"))
    return tuple(out)


def _requirement_problem(records: Sequence[tuple[Mapping[str, object], str]]) -> str | None:
    """Return what is wrong with an item's stat records, or None when they can be used."""
    if not records:
        return "no stat record in the base-game files, so it would read as no requirement"
    parsed = [_stats(record.get(field)) for record, field in records]
    for stats in parsed:
        if stats is None:
            return "its stat record is blank or has a value with no stat name"
    usable = cast("list[dict[str, int]]", parsed)
    if not any(sum(stats.values()) for stats in usable):
        return "its stat record is all zeros"
    if any(stats != usable[0] for stats in usable):
        return "two stat records disagree: " + " vs ".join(_format(stats) for stats in usable)
    return None


def _stats(field: object) -> dict[str, int] | None:
    """Return a record's stats by name, or None when any of them cannot be read."""
    if not isinstance(field, list) or not field:
        return None
    out: dict[str, int] = {}
    for entry in cast("list[object]", field):
        attribute = cast("Mapping[str, object]", entry)
        stat = _STATS.get(str(attribute.get("name")).casefold())
        amount = attribute.get("amount")
        if stat is None or not isinstance(amount, int):
            return None
        out[stat] = amount
    return {stat: amount for stat, amount in out.items() if amount}


def _format(stats: Mapping[str, int]) -> str:
    """Return stats the way the game shows them, such as `INT 19, ARC 15`."""
    return ", ".join(f"{stat.upper()} {amount}" for stat, amount in stats.items())


def holds_ash_gaps(sources: GapSources) -> tuple[Gap, ...]:
    """Return a gap per DLC or Tarnished weapon the unique-skill sheet cannot settle.

    The sheet settles the base game (`tasklist.md` O35). Beyond it, the sheet misses weapons and
    names skills that are real ashes, so being on or off it says nothing for sure.
    """
    carriers = {
        _UPGRADE.sub("", weapon) for names in sources.ash_sources.values() for weapon in names
    }
    ashes = _ash_sheet_rows(sources.ash_sheet) | {
        item.name for item in sources.table if item.category == "ash"
    }
    out: list[Gap] = []
    for item in sources.table:
        if item.category not in ("weapon", "shield"):
            continue
        if item_origin(item, sources.catalog, sources.variants) == "base":
            continue
        skills = sources.unique_skills.get(item.name)
        if skills is None:
            if item.name in carriers or item.subcategory in _NEVER_ASKED_CLASSES:
                continue
            problem = "not on the unique-skill sheet, which lacks some DLC weapons"
        else:
            real = sorted({skill for skill in skills if skill in ashes})
            if not real:
                continue
            problem = f"on the unique-skill sheet, but its skill {', '.join(real)} is a real ash"
        out.append(_gap("holds_ash", item, sources, problem, "2.4.5", "both"))
    return tuple(out)


def ash_gaps(sources: GapSources) -> tuple[Gap, ...]:
    """Return a gap per pool ash the ash sheet has no row for."""
    rows = _ash_sheet_rows(sources.ash_sheet)
    return tuple(
        _gap(
            "ash_usable_on",
            item,
            sources,
            "the ash sheet has no row for it, so nothing says which weapons can hold it",
            "2.4.6",
            "both",
        )
        for item in sources.table
        if item.category == "ash" and item.name not in rows
    )


def class_gaps(sources: GapSources) -> tuple[Gap, ...]:
    """Return a gap per weapon class the ash sheet has no column for."""
    start = sources.ash_sheet.header.index(_ASH_SHEET_FIRST_CLASS)
    columns = {
        _ASH_SHEET_CLASSES.get(name, name.casefold().replace(" ", "_"))
        for name in sources.ash_sheet.header[start:]
        if name != _ASH_SHEET_NOT_A_CLASS
    }
    classes = {
        item.subcategory
        for item in sources.table
        if item.category in ("weapon", "shield") and item.subcategory is not None
    }
    return tuple(
        Gap(
            area="class_ashes",
            item=name.replace("_", " ").title().replace(" To ", "-to-"),
            origin="dlc",
            problem="the ash sheet has no column for this class, so its weapons have no ash list",
            found_by="check",
            step="2.4.6",
            owner="both",
        )
        for name in sorted(classes - columns)
    )


def remembrance_gaps(sources: GapSources, names: PlacementNames) -> tuple[Gap, ...]:
    """Return a gap per remembrance Enia takes, since its items take its boss's location."""
    sold: dict[str, set[Item]] = {}
    for slot in sources.slots:
        if not slot.is_randomizable:
            continue
        for line in slot.debug_lines:
            match = _REMEMBRANCE.search(line)
            item = names.resolve_slot_line(line) if _ENIA in line else None
            if match is not None and item is not None:
                sold.setdefault(match[1], set()).add(item)
    out: list[Gap] = []
    for remembrance, items in sold.items():
        origins = {item_origin(item, sources.catalog, sources.variants) for item in items}
        listed = ", ".join(sorted(item.name for item in items))
        out.append(
            Gap(
                area="remembrance_boss",
                item=remembrance,
                origin="dlc" if "dlc" in origins else "base",
                problem=f"which boss gives it? Enia sells {listed} for it",
                found_by="check",
                step="2.8.3",
                owner="both",
            )
        )
    return tuple(out)


def find_gaps(sources: GapSources) -> tuple[Gap, ...]:
    """Return every gap the checks can see."""
    names = placement_names(sources.table, sources.catalog, sources.variants)
    return (
        *requirement_gaps(sources),
        *holds_ash_gaps(sources),
        *ash_gaps(sources),
        *class_gaps(sources),
        *remembrance_gaps(sources, names),
    )


def reconcile(
    found: Iterable[Gap], tracked: Iterable[Gap], overrides: Mapping[str, frozenset[str]]
) -> tuple[str, ...]:
    """Return why the list disagrees with the checks and the override files, if it does."""
    gaps = {gap.key: gap for gap in found}
    rows = {gap.key: gap for gap in tracked}
    out: list[str] = []
    for key, gap in gaps.items():
        row = rows.get(key)
        if row is None:
            out.append(f"{key[0]} {key[1]!r} has no row")
        elif row.origin != gap.origin:
            out.append(f"{key[0]} {key[1]!r} is {gap.origin}, the row says {row.origin}")
    for key, row in rows.items():
        if row.found_by == "check" and row.status != "applied" and key not in gaps:
            out.append(f"{key[0]} {key[1]!r} is {row.status}, but the check no longer finds it")
        if (
            row.status == "applied"
            and row.found_by == "check"
            and row.area in _OVERRIDE_FILES
            and row.item not in overrides.get(row.area, frozenset())
        ):
            out.append(f"{key[0]} {key[1]!r} is applied, but {_OVERRIDE_FILES[row.area]} lacks it")
    return tuple(out)


def add_missing(found: Iterable[Gap], tracked: Iterable[Gap]) -> tuple[Gap, ...]:
    """Return the rows plus one for every gap that has none, leaving the rest untouched."""
    rows = {gap.key: gap for gap in tracked}
    for gap in found:
        rows.setdefault(gap.key, gap)
    return tuple(rows.values())


def load_overrides(overrides_dir: Path) -> dict[str, frozenset[str]]:
    """Return `{area: the names its override file holds}`; a missing file holds nothing."""
    out: dict[str, frozenset[str]] = {}
    for area, name in _OVERRIDE_FILES.items():
        path = overrides_dir / name
        if path.is_file():
            out[area] = frozenset(row[0] for row in read_table(path).rows)
    return out


def load_sources(root: Path) -> GapSources:
    """Return what the checks read, from a checkout's `raw/` and `data/overrides/`."""
    raw = root / "raw"
    overrides = root / "data" / "overrides"
    catalog = load_item_catalog(raw / "pc_mod_data" / "iteminfo.txt")
    variants = load_name_variants(overrides / "name_variants.csv")
    ash_sources = load_ash_sources(overrides / "ash_sources.csv")
    sheet = load_consumable_categories(raw / "csv" / "tools_consumables_categories.csv")
    weapons = build_weapons(
        catalog,
        variants,
        load_added_items(overrides / "items.csv"),
        load_weapon_categories(raw / "csv" / "weapons_shields_categories.csv"),
    )
    unique_skills = _unique_skills(load_somber_weapons(raw / "csv" / "ashes_somber_weapons.csv"))
    weapons = assign_infusable(
        assign_str_bonus(weapons, load_str_bonus(overrides / "str_bonus_2h.csv")),
        set(unique_skills),
        load_infusable(overrides / "infusable.csv"),
    )
    table = build_item_table(
        (
            *weapons,
            *assign_armor_slots(
                build_armor(catalog, variants),
                load_document(raw / "json-no-dlc", "armors").records,
                variants,
                load_armor_slots(overrides / "armor_slots.csv"),
            ),
            *build_talismans(catalog),
            *build_ashes(catalog, variants, ash_sources),
            *build_sorceries(catalog, variants),
            *build_incantations(catalog, variants),
            *build_tools(catalog, sheet),
            *build_consumables(sheet),
            none_item(),
        )
    )
    ash_sheet = load_ash_compatibility(raw / "csv" / "ashes_compatibility_no_DLC.csv")
    json_dir = raw / "json-no-dlc"
    return GapSources(
        table=table,
        catalog=catalog,
        variants=variants,
        ash_sources=ash_sources,
        ash_sheet=ash_sheet,
        ash_compatibility=build_ash_compatibility(
            table, ash_sheet, load_ash_overrides(overrides / "ash_compatibility.csv")
        ),
        unique_skills=unique_skills,
        requirement_records={
            document: load_document(json_dir, document).records
            for document, _, _ in _REQUIREMENT_FIELDS
        },
        slots=load_slots(raw / "pc_mod_data" / "itemslots_stable.txt"),
    )


def _unique_skills(sheet: CsvTable) -> dict[str, tuple[str, ...]]:
    """Return `{weapon: its skill names}`; the sheet's first column names the weapon."""
    skill = sheet.column("Name")
    found: dict[str, set[str]] = {}
    for row in sheet.rows:
        cell = row[0].strip()
        if not cell:
            continue
        for weapon in _JOINED_SHEET_NAMES.get(cell, (cell,)):
            found.setdefault(weapon, set()).add(_SKILL_SUFFIX.sub("", row[skill]).strip())
    return {weapon: tuple(sorted(skills)) for weapon, skills in found.items()}


def _ash_sheet_rows(sheet: CsvTable) -> frozenset[str]:
    """Return the ashes the ash sheet has a row for."""
    name = sheet.column("Name")
    return frozenset(row[name].strip() for row in sheet.rows)


def _gap(area: str, item: Item, sources: GapSources, problem: str, step: str, owner: Owner) -> Gap:
    """Return a gap a check found on one item."""
    return Gap(
        area=area,
        item=item.name,
        origin=item_origin(item, sources.catalog, sources.variants),
        problem=problem,
        found_by="check",
        step=step,
        owner=owner,
    )


def main() -> None:
    """Add a row to `data/gaps.csv` for every gap that has none, and say what disagrees."""
    root = Path(__file__).resolve().parents[3]
    path = root / "data" / "gaps.csv"
    tracked = load_gaps(path)
    found = find_gaps(load_sources(root))
    rows = add_missing(found, tracked)
    write_gaps(path, rows)
    print(f"{len(rows)} rows, {len(rows) - len(tracked)} new")
    for problem in reconcile(found, rows, load_overrides(root / "data" / "overrides")):
        print(problem)


if __name__ == "__main__":
    main()
