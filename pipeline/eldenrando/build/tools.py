"""A transform stays a row at `odds = 0`, so it never rolls.

The sheet is attack data, so `Omen Bairn 1` and `Omen Bairn 2` are the uncharged and charged
attacks of one item. Folding those suffixes gives the base names the tool and consumable pools
both start from. `image` stays at its default here.
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
    return _ATTACK_SUFFIX.sub("", sheet_name)


def sheet_base_names(sheet: CsvTable) -> tuple[str, ...]:
    column = sheet.column("Name")
    return tuple(dict.fromkeys(base_name(row[column]) for row in sheet.rows))


def build_tools(catalog: ItemCatalog, sheet: CsvTable) -> tuple[Item, ...]:
    in_sheet = set(sheet_base_names(sheet))
    in_catalog = set(catalog.names["goods"].values())
    unknown = sorted(
        {name for name in TOOLS if name not in in_sheet}
        | {name for name in (*TOOLS, *TRANSFORMS) if name not in in_catalog}
    )
    if unknown:
        raise BuildError(f"tool whitelist names unknown item(s): {', '.join(unknown)}")
    return tuple(new_item(name, "tool") for name in (*TOOLS, *TRANSFORMS))
