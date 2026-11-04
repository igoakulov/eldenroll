"""These are build-time constants, because a shipped vocabulary table would mean a join for a label.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Final, get_args

from eldenrando.model.item import Category

CATEGORIES: Final[frozenset[str]] = frozenset(get_args(Category))
BUILDS: Final[tuple[str, ...]] = (
    "knight",
    "warrior_2h",
    "warrior_dw",
    "ranger",
    "mage",
    "spellblade",
    "jester",
)
ASH_SLOTS: Final[frozenset[str]] = frozenset({"rh_ash", "lh_ash"})
SLOTS: Final[tuple[str, ...]] = (
    "rh",
    "rh_ash",
    "lh",
    "lh_ash",
    "spell",
    "item",
    "talisman_1",
    "talisman_2",
    "rule_1",
    "rule_2",
)
BUILD_ASH_SLOTS: Final[Mapping[str, frozenset[str]]] = {
    "knight": ASH_SLOTS,
    "warrior_2h": frozenset({"rh_ash"}),
    "warrior_dw": ASH_SLOTS,
    "ranger": frozenset({"rh_ash"}),
    "mage": frozenset(),
    "spellblade": frozenset({"rh_ash"}),
    "jester": frozenset({"rh_ash"}),
}

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
# These classes need no second weapon: two-handing one draws its pair.
PAIRED: Final[frozenset[str]] = frozenset(
    {"fist", "claw", "beast_claw", "hand_to_hand", "backhand_blade", "throwing_blade"}
)
UNPAIRED: Final[frozenset[str]] = MELEE - PAIRED
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
SUBCATEGORY_GROUPS: Final[Mapping[str, frozenset[str]]] = {
    "melee": MELEE,
    "paired": PAIRED,
    "unpaired": UNPAIRED,
    "ranged": RANGED,
    "catalyst": CATALYST,
    "shield": SHIELD,
}
