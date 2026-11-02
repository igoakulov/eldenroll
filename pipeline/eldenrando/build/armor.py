"""Armor rows, from the mod's armor group.

Altering is left to the player, so no name carries `(Altered)`. The pieces `iteminfo` holds only
in altered form are renamed by `name_variants.csv`; every other altered piece merges into its
unaltered row, and placement unions their locations. An altered piece with neither stops the
build instead of dropping a row.

`subcategory` and `image` stay at their defaults here; later steps fill them in and validation
enforces them.
"""

from __future__ import annotations

from collections.abc import Mapping

from eldenrando.build.items import canonical_names, new_item
from eldenrando.errors import BuildError
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.name_variant import NameVariant

_ALTERED_SUFFIX = " (Altered)"


def build_armor(catalog: ItemCatalog, variants: Mapping[str, NameVariant]) -> tuple[Item, ...]:
    """Return one row per armor piece, in group order, or raise `BuildError`."""
    names = canonical_names(catalog, "protectors", "protector", variants)
    known = set(names)
    orphans = sorted(
        name
        for name in names
        if name.endswith(_ALTERED_SUFFIX) and name.removesuffix(_ALTERED_SUFFIX) not in known
    )
    if orphans:
        raise BuildError(f"altered piece(s) with no unaltered row: {', '.join(orphans)}")
    return tuple(new_item(name, "armor") for name in names if not name.endswith(_ALTERED_SUFFIX))
