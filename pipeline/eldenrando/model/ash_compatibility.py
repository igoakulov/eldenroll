"""One ash fits one weapon class, or a whole category when `subcategory` is null.

This says nothing about a single weapon: whether that can hold an ash at all is its `infusable`
flag (`data.md` §4.5).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AshCompatibility:
    """An ash and the class or category it fits."""

    ash_id: str
    category: str
    subcategory: str | None
