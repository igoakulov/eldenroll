"""Each slot documents what the vanilla game puts in one place, as a list of human-readable lines.
Only five line shapes carry an item name; the rest are prose hints. The name is everything before
the first " - ", and only when the remainder starts with `lot `, `shop ` or `enemy lot `.
"""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.schema import (
    check_keys,
    get_optional_string,
    get_string,
    get_string_list,
    get_words,
    require_mapping,
    require_sequence,
    require_string,
)
from eldenrando.loaders.yaml_source import load_mapping
from eldenrando.model.item_slot import ItemSlot

_SLOT_FIELDS = frozenset(
    {
        "Key",
        "DebugText",
        "Text",
        "Area",
        "Tags",
        "FullArea",
        "Comment",
        "QuestReqs",
        "Event",
        "Until",
        "ItemName",
    }
)
_ITEM_SOURCES = ("lot ", "shop ", "enemy lot ")


def load_slots(path: Path) -> tuple[ItemSlot, ...]:
    """Return every slot in an itemslots document, junk slots included."""
    document = load_mapping(path)
    return tuple(
        _parse_slot(entry, f"Slots[{index}]")
        for index, entry in enumerate(require_sequence(document.get("Slots"), "Slots"))
    )


def _parse_slot(entry: object, where: str) -> ItemSlot:
    mapping = require_mapping(entry, where)
    check_keys(mapping, _SLOT_FIELDS, where)
    debug_lines = get_string_list(mapping, "DebugText", where)
    return ItemSlot(
        key=get_string(mapping, "Key", where),
        area=get_string(mapping, "Area", where),
        text=get_string(mapping, "Text", where),
        tags=get_words(mapping, "Tags", where),
        full_areas=get_words(mapping, "FullArea", where),
        quest_reqs=get_words(mapping, "QuestReqs", where),
        event=get_optional_string(mapping, "Event", where),
        until=get_optional_string(mapping, "Until", where),
        item_name=get_optional_string(mapping, "ItemName", where),
        debug_lines=debug_lines,
        items=extract_items(debug_lines),
    )


def extract_items(debug_lines: tuple[str, ...]) -> tuple[str, ...]:
    names = [name for line in debug_lines for name in _item_of(line)]
    return tuple(names)


def _item_of(line: str) -> tuple[str, ...]:
    head, separator, rest = line.partition(" - ")
    if not separator or not rest.startswith(_ITEM_SOURCES):
        return ()
    name = require_string(head.strip(), "DebugText item name")
    return (name,) if name else ()
