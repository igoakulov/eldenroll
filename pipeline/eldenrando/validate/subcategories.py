"""Every item's category and subcategory are in the vocabulary, or null where it has none."""

from __future__ import annotations

from collections.abc import Iterable

from eldenrando.errors import BuildError
from eldenrando.model.item import Item
from eldenrando.model.vocabulary import CATEGORIES, SUBCATEGORIES


def validate_subcategories(table: Iterable[Item]) -> None:
    """Raise unless each row's subcategory fits a known category, naming the rows that fail."""
    bad = [f"{row.name} ({row.category}: {row.subcategory})" for row in table if not _is_valid(row)]
    if bad:
        raise BuildError(f"bad category or subcategory on: {', '.join(sorted(bad))}")


def _is_valid(row: Item) -> bool:
    """Return whether a row's category is known and its subcategory fits it."""
    if row.category not in CATEGORIES:
        return False
    allowed = SUBCATEGORIES.get(row.category)
    if allowed is None:
        return row.subcategory is None
    return row.subcategory in allowed
