"""One selector, the single dialect for slot pools and modifier targets (`prd.md` §8.4)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

SelectorKind = Literal["item", "subcategory", "category", "rule", "armor_set", "slot", "boss"]

SELECTOR_KINDS: Final[tuple[SelectorKind, ...]] = (
    "item",
    "subcategory",
    "category",
    "rule",
    "armor_set",
    "slot",
    "boss",
)


@dataclass(frozen=True, slots=True)
class Selector:
    """The options of one kind that match; `ids` is OR, and `None` means every option."""

    kind: SelectorKind
    ids: tuple[str, ...] | None
