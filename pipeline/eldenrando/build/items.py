"""The item table: pool rows joined into one list with unique ids.

Each pool prunes its own category before it gets here (`data.md` §8.6), because the same name
can be excluded in one category and kept in another: `Carian Retaliation` is out as a sorcery
and in as an ash. This table only rejects the names that may never be a row in any category.

A name may repeat across categories, but an id may not, because references carry no category.
Items whose slugs collide all take a category suffix; a unique slug takes none.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import replace

from eldenrando.errors import BuildError
from eldenrando.model.item import Category, Item
from eldenrando.normalize.slug import slugify

_NEVER_A_ROW: frozenset[str] = frozenset({"Lamenter's Mask - Attack"})
_NEVER_IN_A_NAME: tuple[str, ...] = ("(Altered)", "?ITEM?", "[ERROR]", "unused ESD")
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
    """Return an item whose id is the slug of its name, or raise `BuildError`."""
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


def build_item_table(items: Iterable[Item]) -> tuple[Item, ...]:
    """Return the rows in input order with final ids, or raise `BuildError`."""
    rows = tuple(items)
    _reject_excluded(rows)
    _reject_repeats(f"{row.category}: {row.name}" for row in rows)
    _reject_repeats(f"{row.category}: {row.id}" for row in rows)
    slug_counts = Counter(row.id for row in rows)
    final = tuple(
        replace(row, id=f"{row.id}_{row.category}") if slug_counts[row.id] > 1 else row
        for row in rows
    )
    _reject_repeats(row.id for row in final)
    return final


def _reject_excluded(rows: Iterable[Item]) -> None:
    """Raise when a row is a placeholder, an `any` state or an alias label."""
    excluded = sorted(
        row.name
        for row in rows
        if row.name in _NEVER_A_ROW
        or row.name.lower() == _ANY
        or row.name.startswith(_ALIAS_PREFIX)
        or any(marker in row.name for marker in _NEVER_IN_A_NAME)
    )
    if excluded:
        raise BuildError(f"item table holds excluded name(s): {', '.join(excluded)}")


def _reject_repeats(keys: Iterable[str]) -> None:
    """Raise when a key appears more than once, naming every repeated key."""
    repeated = sorted(key for key, count in Counter(keys).items() if count > 1)
    if repeated:
        raise BuildError(f"item table repeats: {', '.join(repeated)}")
