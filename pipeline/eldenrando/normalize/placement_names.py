"""Slot lines and drop cells name items in forms no row carries: `Ash of War: Parry`, `Rogier's
Rapier +8`, `Festive Garb (Altered)`, `[Sorcery] Gravity Well`, `Kukri x5`. A name outside the
pool resolves to nothing, because most of what these sources list can never roll.

A bare name is never an ash. An ash's canonical name drops the source's prefix, so it can equal
another item's name: a bare `Glintstone Pebble` is the sorcery, and a bare `Thops's Barrier` is
an excluded sorcery, not the ash.

Most `name_variants.csv` rows must stay id-only: `Beast Claw` is the incantation's JSON name and
also the weapon's real name. So only a row marked `by_name` applies here. The id on a slot line
wins over its name, which is how `Beast Claw (Goods 6820)` reaches the incantation.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from eldenrando.errors import BuildError
from eldenrando.loaders.itemslots import extract_items
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.name_variant import NameVariant

_ASH_PREFIX = "Ash of War: "
_DROP_TAG = "[Sorcery] "
_ALTERED_SUFFIX = " (Altered)"
_QUANTITY = re.compile(r" x\d+$")
_UPGRADE = re.compile(r" \+\d+$")
_ID_TAG = re.compile(r"\((Goods|Weapon|Protector|Accessory|Gem) (\d+)\)")
_CATALOG_KINDS: Mapping[str, str] = {
    "Goods": "goods",
    "Weapon": "weapon",
    "Protector": "protector",
    "Accessory": "accessory",
    "Gem": "gem",
}


@dataclass(frozen=True, slots=True)
class PlacementNames:
    items: Mapping[str, Item]
    ashes: Mapping[str, Item]
    renames: Mapping[str, str]
    catalog: ItemCatalog
    variants: Mapping[str, NameVariant]

    def resolve(self, source_name: str) -> Item | None:
        """Return the row a slot or drop name means, or None when it is outside the pool."""
        name = _QUANTITY.sub("", source_name.removeprefix(_DROP_TAG))
        if name.startswith(_ASH_PREFIX):
            return self.ashes.get(name.removeprefix(_ASH_PREFIX))
        name = self.renames.get(name, name)
        item = self.items.get(name)
        if item is not None:
            return item
        if name.endswith(_ALTERED_SUFFIX):
            piece = self.items.get(name.removesuffix(_ALTERED_SUFFIX))
            return piece if piece is not None and piece.category == "armor" else None
        weapon = self.items.get(_UPGRADE.sub("", name))
        return weapon if weapon is not None and weapon.category in ("weapon", "shield") else None

    def resolve_slot_line(self, line: str) -> Item | None:
        """Return the row a `DebugText` line places, or None for prose and non-pool items."""
        names = extract_items((line,))
        if not names:
            return None
        tag = _ID_TAG.search(line)
        tagged = None if tag is None else self._tagged_name(tag[1], tag[2])
        return self.resolve(names[0] if tagged is None else tagged)

    def _tagged_name(self, kind: str, item_id: str) -> str | None:
        """Return the canonical name of a tagged id, or None when the catalog lacks the id."""
        name = self.catalog.names[_CATALOG_KINDS[kind]].get(int(item_id))
        if name is None:
            return None
        variant = self.variants.get(item_id)
        return name if variant is None else variant.canonical_name


def placement_names(
    table: Iterable[Item], catalog: ItemCatalog, variants: Mapping[str, NameVariant]
) -> PlacementNames:
    rows = tuple(row for row in table if row.category != "none")
    ashes = {row.name: row for row in rows if row.category == "ash"}
    items: dict[str, Item] = {}
    for row in rows:
        if row.category == "ash":
            continue
        if row.name in items:
            raise BuildError(f"two non-ash rows share the name {row.name!r}")
        items[row.name] = row
    return PlacementNames(
        items=items,
        ashes=ashes,
        renames=_renames(variants, items),
        catalog=catalog,
        variants=variants,
    )


def _renames(variants: Mapping[str, NameVariant], items: Mapping[str, Item]) -> dict[str, str]:
    out: dict[str, str] = {}
    for variant in variants.values():
        if not variant.by_name:
            continue
        if variant.source_name in items:
            raise BuildError(f"by-name variant {variant.source_name!r} is also a real item's name")
        if variant.canonical_name not in items:
            raise BuildError(f"by-name variant names no item: {variant.canonical_name!r}")
        out[variant.source_name] = variant.canonical_name
    return out
