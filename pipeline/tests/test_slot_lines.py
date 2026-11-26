"""Which lines of a slot's `DebugText` name an item
(`data/sources/README.md#The mod's YAML files`)."""

from __future__ import annotations

from eldenroll.loaders.itemslots import extract_items


def test_extract_items_ignores_prose() -> None:
    lines = (
        "Golden Rune [1] - lot 100000[asset AEG099_090_9000 (Corpse)] Golden Rune [1]",
        "By Church of Elleh (Limgrave) - 20.34 away, 10.24 o'clock, 1.35 height offset",
        "Unique location in [m11_10_00_00 (Roundtable Hold)]",
        "Church of Vows), m60_37_46_00 (Liurnia of the Lakes - Church of Vows)",
        "Ash of War: Spinning Weapon - shop 100200[enemy c0000_9022 ...] 1x for 1000 runes",
    )
    assert extract_items(lines) == ("Golden Rune [1]", "Ash of War: Spinning Weapon")












