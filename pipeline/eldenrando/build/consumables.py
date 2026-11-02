"""Consumable rows, classified from the tool and consumable sheet (`data.md` §4.9).

The sheet is the source: most pots and perfumes have no name in `iteminfo`, because the mod does
not place crafted items. `subCategory1` and `subCategory2` carry the class where they can; the
throwables they leave blank are an explicit list, not a heuristic. A name that fits no class
stops the build instead of dropping a row.

`alias` and `image` stay at their defaults here; later steps fill them in and validation
enforces them.
"""

from __future__ import annotations

from eldenrando.build.items import new_item
from eldenrando.build.tools import TOOLS, base_name
from eldenrando.errors import BuildError
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.model.item import Item

NOT_AN_ITEM = "Lamenter's Mask - Attack"
NAMED_THROWABLES: frozenset[str] = frozenset(
    {
        "Call of Tibia",
        "Cuckoo Glintstone",
        "Explosive Stone",
        "Explosive Stone Clump",
        "Fire Coil",
        "Fire Spritestone",
        "Glinting Nail",
        "Glintstone Scrap",
        "Large Glintstone Scrap",
        "Gravity Stone Chunk",
        "Gravity Stone Fan",
        "Innard Meat",
        "Poisoned Stone",
        "Poisoned Stone Clump",
        "Roundrock",
        "Ruin Fragment",
        "Spritestone",
        "Surging Frenzied Flame",
    }
)
_POTS_1 = "Cracked / Ritual Pot"
_POTS_2 = "Hefty Cracked Pot"
_PERFUMES_1 = "Perfume Bottle"
_THROWABLES_1 = "Weapon-Throwing Attack"


def build_consumables(sheet: CsvTable) -> tuple[Item, ...]:
    """Return one row per consumable, in sheet order, or raise `BuildError`."""
    name_column = sheet.column("Name")
    first_column = sheet.column("subCategory1")
    second_column = sheet.column("subCategory2")
    classes: dict[str, tuple[str, str]] = {}
    for row in sheet.rows:
        classes.setdefault(base_name(row[name_column]), (row[first_column], row[second_column]))
    absent = sorted(NAMED_THROWABLES - set(classes))
    if absent:
        raise BuildError(f"named throwable(s) not in the sheet: {', '.join(absent)}")
    return tuple(
        new_item(name, "consumable", subcategory=_subcategory(name, first, second))
        for name, (first, second) in classes.items()
        if name not in TOOLS and name != NOT_AN_ITEM
    )


def _subcategory(name: str, first: str, second: str) -> str:
    """Return the class of one consumable, or raise `BuildError`."""
    if first == _POTS_1 or second == _POTS_2:
        return "pots"
    if first == _PERFUMES_1:
        return "perfumes"
    if first == _THROWABLES_1 or name in NAMED_THROWABLES:
        return "throwables"
    raise BuildError(f"consumable {name!r} fits no class")
