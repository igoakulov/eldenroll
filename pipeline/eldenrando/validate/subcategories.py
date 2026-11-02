"""Every item's subcategory is in the vocabulary, or null where its category has none."""

from __future__ import annotations

from collections.abc import Iterable

from eldenrando.errors import BuildError
from eldenrando.model.item import Item
from eldenrando.model.vocabulary import SUBCATEGORIES


def validate_subcategories(table: Iterable[Item]) -> None:
    """Raise unless each row's subcategory belongs to its category, naming the rows that fail."""
    bad = [f"{row.name} ({row.category}: {row.subcategory})" for row in table if not _is_valid(row)]
    if bad:
        raise BuildError(f"bad subcategory on: {', '.join(sorted(bad))}")


def _is_valid(row: Item) -> bool:
    """Return whether a row's subcategory fits its category."""
    allowed = SUBCATEGORIES.get(row.category)
    if allowed is None:
        return row.subcategory is None
    return row.subcategory in allowed
