"""Pools prune their own category first, because the same name can be excluded in one category and
kept in another: `Carian Retaliation` is out as a sorcery and in as an ash. This table only
rejects names that may never be a row in any category.

A name may repeat across categories, but an id may not, because references carry no category.
Items whose slugs collide all take a category suffix; a unique slug takes none.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.model.item import Category, Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.name_variant import NameVariant
from eldenrando.normalize.slug import slugify

_NEVER_A_ROW: frozenset[str] = frozenset({"Lamenter's Mask - Attack"})
_NEVER_IN_A_NAME: tuple[str, ...] = ("?ITEM?", "[ERROR]", "unused ESD")
_ALTERED = "(Altered)"
_ANY = "any"
_ALIAS_PREFIX = "Any "


def new_item(
    name: str,
    category: Category,
    *,
    subcategory: str | None = None,
    infusable: bool | None = None,
    str_bonus_2h: bool | None = None,
    alias: str | None = None,
    image: str | None = None,
    req_str: int = 0,
    req_dex: int = 0,
    req_int: int = 0,
    req_fth: int = 0,
    req_arc: int = 0,
) -> Item:
    item_id = slugify(name)
    if not item_id:
        raise BuildError(f"item name {name!r} has no slug")
    return Item(
        id=item_id,
        name=name,
        category=category,
        subcategory=subcategory,
        infusable=infusable,
        str_bonus_2h=str_bonus_2h,
        alias=alias,
        image=image,
        req_str=req_str,
        req_dex=req_dex,
        req_int=req_int,
        req_fth=req_fth,
        req_arc=req_arc,
    )


def none_item() -> Item:
    """Return the row a slot samples for a deliberately empty result (`prd.md` §6.7)."""
    return new_item("none", "none", str_bonus_2h=False)


def canonical_names(
    catalog: ItemCatalog, group: str, kind: str, variants: Mapping[str, NameVariant]
) -> tuple[str, ...]:
    source_names = catalog.names[kind]
    out: list[str] = []
    for item_id in catalog.groups[group].items[kind]:
        source_name = source_names.get(item_id)
        if source_name is None:
            raise BuildError(f"{kind} id {item_id} has no name")
        variant = variants.get(str(item_id))
        if variant is None:
            out.append(source_name)
        elif variant.source_name == source_name:
            out.append(variant.canonical_name)
        else:
            raise BuildError(
                f"name variant for id {item_id} expects {variant.source_name!r}, "
                f"source says {source_name!r}"
            )
    return tuple(out)


def build_item_table(items: Iterable[Item]) -> tuple[Item, ...]:
    rows = tuple(items)
    _reject_excluded(rows)
    empties = sorted(row.name for row in rows if row.category == "none")
    if len(empties) > 1:
        raise BuildError(f"item table holds {len(empties)} none rows: {', '.join(empties)}")
    _reject_repeats(f"{row.category}: {row.name}" for row in rows)
    _reject_repeats(f"{row.category}: {row.id}" for row in rows)
    slug_counts = Counter(row.id for row in rows)
    final = tuple(
        replace(row, id=f"{row.id}_{row.category}") if slug_counts[row.id] > 1 else row
        for row in rows
    )
    _reject_repeats(row.id for row in final)
    return final


def never_a_row(rows: Iterable[Item]) -> tuple[str, ...]:
    return tuple(
        sorted(
            row.name
            for row in rows
            if row.name in _NEVER_A_ROW
            or row.name.lower() == _ANY
            or row.name.startswith(_ALIAS_PREFIX)
            or any(marker in row.name for marker in _NEVER_IN_A_NAME)
            or (_ALTERED in row.name and row.category != "armor")
        )
    )


def _reject_excluded(rows: Iterable[Item]) -> None:
    excluded = never_a_row(rows)
    if excluded:
        raise BuildError(f"item table holds excluded name(s): {', '.join(excluded)}")


def _reject_repeats(keys: Iterable[str]) -> None:
    repeated = sorted(key for key, count in Counter(keys).items() if count > 1)
    if repeated:
        raise BuildError(f"item table repeats: {', '.join(repeated)}")
