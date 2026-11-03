"""The item lookup built from `item_info.yaml`.

`iteminfo` is a **lookup, not the catalog**. It names 2,448 items across five categories,
most of which (runes, keys, cookbooks, crafting materials) can never be rolled. The `item`
table is built from the pool sources and holds only rollable items; this lookup is used to
resolve a name to a source id and to detect naming drift.

Names are unique across all categories, so a name alone identifies an entry.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CatalogGroup:
    """One of the 29 item groups the randomizer randomizes together."""

    name: str
    items: dict[str, tuple[int, ...]]
    item_count: int
    location_count: int
    unique_count: int


@dataclass(frozen=True, slots=True)
class CatalogLocation:
    """One prose location entry: tags, how many items sit there, and descriptions."""

    tags: tuple[str, ...]
    count: int
    real_count: int | None
    descriptions: dict[str, int]


@dataclass(frozen=True, slots=True)
class ItemCatalog:
    """Ids, names, counts, groups and locations from `item_info.yaml`."""

    names: dict[str, dict[int, str]]
    counts: dict[str, dict[int, int]]
    unique_counts: dict[str, dict[int, int]]
    groups: dict[str, CatalogGroup]
    locations: tuple[CatalogLocation, ...]

    def find(self, name: str) -> tuple[str, int] | None:
        """Return the `(category, id)` for `name`, or None when unknown."""
        for category, entries in self.names.items():
            for entry_id, entry_name in entries.items():
                if entry_name == name:
                    return (category, entry_id)
        return None
