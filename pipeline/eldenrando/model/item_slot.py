"""One placement slot from `itemslots_stable.txt`.

A slot is a place in the world that holds items in the unrandomized game. The randomizer
adds one more slot per place (`Area: unknown`, `Key` starting `999999`) which is a mod test
fixture rather than a location; those are marked with the `ignore` tag and must never
become a `location` row.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ItemSlot:
    """A single slot and the items the vanilla game places there."""

    key: str
    area: str
    text: str
    tags: tuple[str, ...]
    full_areas: tuple[str, ...]
    quest_reqs: tuple[str, ...]
    event: str | None
    until: str | None
    item_name: str | None
    debug_lines: tuple[str, ...]
    items: tuple[str, ...]

    @property
    def is_randomizable(self) -> bool:
        """Return whether the slot is a real location the randomizer may place into.

        `ignore` marks the mod's own fixture slots and two unused-item slots. They carry
        placeholder text (`aaaaaaaaaaaaaaaaa`), unused entity ids, or `[ERROR]` names, and
        none of them holds the only copy of a pool item.
        """
        return "ignore" not in self.tags
