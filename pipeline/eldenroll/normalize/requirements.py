"""The base-game JSON supplies them, under stat names that vary in case and form. `requirements.csv`
wins over it. A value with no usable stat name is left out, so a broken record keeps whatever it
can still say, and `data/gaps.csv` tracks it until an override corrects it. An item with no
record stays at zero the same way.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import replace
from typing import Final, cast

from eldenroll.model.item import Item
from eldenroll.model.name_variant import NameVariant

STAT_NAMES: Final[Mapping[str, str]] = {
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
# Document, its requirement field, and the categories its records may belong to.
REQUIREMENT_FIELDS: Final[tuple[tuple[str, str, tuple[str, ...]], ...]] = (
    ("weapons", "requiredAttributes", ("weapon", "shield")),
    ("shields", "requiredAttributes", ("weapon", "shield")),
    ("sorceries", "requires", ("sorcery", "incantation")),
    ("incantations", "requires", ("sorcery", "incantation")),
)


def readable_stats(field: object) -> dict[str, int]:
    """Return a record's non-zero stats by name, leaving out what cannot be read."""
    if not isinstance(field, list):
        return {}
    out: dict[str, int] = {}
    for entry in cast("list[object]", field):
        attribute = cast("Mapping[str, object]", entry)
        stat = STAT_NAMES.get(str(attribute.get("name")).casefold())
        amount = attribute.get("amount")
        if stat is not None and isinstance(amount, int) and amount:
            out[stat] = amount
    return out


def assign_requirements(
    items: Iterable[Item],
    records: Mapping[str, Iterable[Mapping[str, object]]],
    variants: Mapping[str, NameVariant],
    overrides: Mapping[str, Mapping[str, int]],
) -> tuple[Item, ...]:
    """The first record of an item counts."""
    rows = tuple(items)
    found: dict[tuple[str, str], dict[str, int]] = {}
    for document, field, categories in REQUIREMENT_FIELDS:
        for record in records[document]:
            variant = variants.get(str(record["id"]))
            name = str(record["name"]) if variant is None else variant.canonical_name
            for category in categories:
                found.setdefault((category, name.casefold()), readable_stats(record.get(field)))
    return tuple(_with_stats(row, found, overrides) for row in rows)


def _with_stats(
    row: Item,
    found: Mapping[tuple[str, str], Mapping[str, int]],
    overrides: Mapping[str, Mapping[str, int]],
) -> Item:
    stats = overrides.get(row.name, found.get((row.category, row.name.casefold())))
    if stats is None:
        return row
    return replace(
        row,
        req_str=stats.get("str", 0),
        req_dex=stats.get("dex", 0),
        req_int=stats.get("int", 0),
        req_fth=stats.get("fth", 0),
        req_arc=stats.get("arc", 0),
    )
