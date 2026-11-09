"""`iteminfo` is a **lookup, not the catalog**: most of what it names can never be rolled, so the
`item` table is built from the pool sources and holds only rollable items. This lookup resolves a
name to a source id and detects naming drift.

Names are unique across all categories, so a name alone identifies an entry.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CatalogGroup:
    name: str
    items: dict[str, tuple[int, ...]]
    item_count: int
    location_count: int
    unique_count: int


@dataclass(frozen=True, slots=True)
class CatalogLocation:
    tags: tuple[str, ...]
    count: int
    real_count: int | None
    descriptions: dict[str, int]


@dataclass(frozen=True, slots=True)
class ItemCatalog:
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
