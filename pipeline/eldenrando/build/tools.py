"""Tool rows: the fixed whitelist of 6 and the 3 transforms, by exact mod name (`data.md` §4.8).

A transform stays a row by owner decision and takes a zero-odds modifier, so it never rolls. The
sheet only holds attack rows, so a transform is checked against the mod's lists alone.

The sheet is attack data, so `Omen Bairn 1` and `Omen Bairn 2` are the uncharged and charged
attacks of one item. Folding those suffixes gives the base names the tool and consumable pools
both start from. A whitelisted name that the sheet or the mod's lists do not hold stops the
build instead of dropping a row.

`image` stays at its default here; a later step fills it in and validation enforces it.
"""

from __future__ import annotations

import re

from eldenrando.build.items import new_item
from eldenrando.errors import BuildError
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog

TOOLS: tuple[str, ...] = (
    "Perfumed Oil of Ranah",
    "Wraith Calling Bell",
    "Ancestral Infant's Head",
    "Omen Bairn",
    "Regal Omen Bairn",
    "Horned Bairn",
)
TRANSFORMS: tuple[str, ...] = ("Lamenter's Mask", "Rock Heart", "Priestess Heart")

_ATTACK_SUFFIX = re.compile(r" [12]$")


def base_name(sheet_name: str) -> str:
    """Return a sheet name without its attack suffix."""
    return _ATTACK_SUFFIX.sub("", sheet_name)


def sheet_base_names(sheet: CsvTable) -> tuple[str, ...]:
    """Return the sheet's names with the attack suffixes folded, each once, in sheet order."""
    column = sheet.column("Name")
    return tuple(dict.fromkeys(base_name(row[column]) for row in sheet.rows))


def build_tools(catalog: ItemCatalog, sheet: CsvTable) -> tuple[Item, ...]:
    """Return the whitelisted tools, then the transforms, or raise `BuildError`."""
    in_sheet = set(sheet_base_names(sheet))
    in_catalog = set(catalog.names["goods"].values())
    unknown = sorted(
        {name for name in TOOLS if name not in in_sheet}
        | {name for name in (*TOOLS, *TRANSFORMS) if name not in in_catalog}
    )
    if unknown:
        raise BuildError(f"tool whitelist names unknown item(s): {', '.join(unknown)}")
    return tuple(new_item(name, "tool") for name in (*TOOLS, *TRANSFORMS))
