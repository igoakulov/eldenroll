"""Altering is left to the player, so an altered piece merges into its unaltered row, and placement
unions their locations. The pieces `iteminfo` holds only in altered form are renamed by
`name_variants.csv`. A piece the game can't alter back stays its own row, under its game name,
when an armor set names it. An altered piece with none of these stops the build instead of dropping
a row.

`image` is left at its default; `normalize/armor_slots.py` sets `subcategory`.
"""

from __future__ import annotations

from collections.abc import Collection, Mapping

from eldenroll.build.items import canonical_names, new_item
from eldenroll.errors import BuildError
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.model.name_variant import NameVariant

_ALTERED_SUFFIX = " (Altered)"


def build_armor(
    catalog: ItemCatalog, variants: Mapping[str, NameVariant], kept: Collection[str] = ()
) -> tuple[Item, ...]:
    names = canonical_names(catalog, "protectors", "protector", variants)
    known = set(names)
    orphans = sorted(
        name
        for name in names
        if name.endswith(_ALTERED_SUFFIX) and name.removesuffix(_ALTERED_SUFFIX) not in known
    )
    if orphans:
        raise BuildError(f"altered piece(s) with no unaltered row: {', '.join(orphans)}")
    return tuple(
        new_item(name, "armor")
        for name in names
        if not name.endswith(_ALTERED_SUFFIX) or name in kept
    )


def added_armor(rows: Mapping[str, tuple[str, str]]) -> tuple[Item, ...]:
    return tuple(new_item(piece, "armor", subcategory=slot) for piece, (slot, _) in rows.items())
