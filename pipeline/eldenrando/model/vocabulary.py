"""The subcategories each category may hold (`prd.md` §6.3).

These are build-time constants, because a shipped vocabulary table would mean a join for a label.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Final

MELEE: Final[frozenset[str]] = frozenset(
    {
        "dagger",
        "straight_sword",
        "greatsword",
        "colossal_sword",
        "curved_sword",
        "curved_greatsword",
        "katana",
        "twinblade",
        "thrusting_sword",
        "heavy_thrusting_sword",
        "axe",
        "greataxe",
        "hammer",
        "great_hammer",
        "flail",
        "spear",
        "great_spear",
        "halberd",
        "reaper",
        "fist",
        "claw",
        "whip",
        "colossal_weapon",
        "light_greatsword",
        "great_katana",
        "backhand_blade",
        "beast_claw",
        "hand_to_hand",
        "throwing_blade",
    }
)
RANGED: Final[frozenset[str]] = frozenset({"light_bow", "bow", "greatbow", "crossbow", "ballista"})
CATALYST: Final[frozenset[str]] = frozenset({"glintstone_staff", "sacred_seal"})
SHIELD: Final[frozenset[str]] = frozenset({"small_shield", "medium_shield", "greatshield"})
NON_MELEE_WEAPON: Final[frozenset[str]] = frozenset({"thrusting_shield", "torch", "perfume_bottle"})
ARMOR_SLOTS: Final[tuple[str, ...]] = ("head", "body", "arms", "legs")
CONSUMABLE: Final[frozenset[str]] = frozenset({"pots", "perfumes", "throwables"})
NO_STR_BONUS: Final[frozenset[str]] = frozenset(
    {
        "fist",
        "claw",
        "beast_claw",
        "hand_to_hand",
        "backhand_blade",
        "throwing_blade",
        "greatbow",
        "ballista",
        "perfume_bottle",
    }
)
NEVER_INFUSABLE: Final[frozenset[str]] = frozenset({"sacred_seal", "crossbow", "ballista"})

SUBCATEGORIES: Final[Mapping[str, frozenset[str]]] = {
    "weapon": MELEE | RANGED | CATALYST | NON_MELEE_WEAPON,
    "shield": SHIELD,
    "armor": frozenset(ARMOR_SLOTS),
    "consumable": CONSUMABLE,
}
