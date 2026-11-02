"""Talisman rows: the fixed 41-item shortlist, by exact mod name (`data.md` §4.4).

The shortlist is the membership, so a name the mod's lists do not hold stops the build instead
of dropping a row. The families below are documentation only; no tag is stored.

`alias` and `image` stay at their defaults here; later steps fill them in and validation
enforces them.
"""

from __future__ import annotations

from eldenrando.build.items import new_item
from eldenrando.errors import BuildError
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import ItemCatalog

SHORTLIST: tuple[str, ...] = (
    # Moveset
    "Dagger Talisman",
    "Curved Sword Talisman",
    "Twinblade Talisman",
    "Axe Talisman",
    "Claw Talisman",
    "Retaliatory Crossed-Tree",
    "Lacerating Crossed-Tree",
    "Rellana's Cameo",
    "Warrior Jar Shard",
    "Shard of Alexander",
    "Blade of Mercy",
    # Status
    "Kindred of Rot's Exultation",
    "Lord of Blood's Exultation",
    # Shield
    "Greatshield Talisman",
    "Pearl Shield Talisman",
    # Tool
    "Companion Jar",
    "Perfumer's Talisman",
    # Other
    "Talisman of Lord's Bestowal",
    "Old Lord's Talisman",
    "Blue Dancer Charm",
    "Verdigris Discus",
    "Red-Feathered Branchsword",
    "Blue-Feathered Branchsword",
    "Godskin Swaddling Cloth",
    "Dried Bouquet",
    # Lower defense
    "Shabriri's Woe",
    "Daedicar's Woe",
    "Beloved Stardust",
    # Soreseal
    "Radagon's Soreseal",
    "Marika's Soreseal",
    # Scarseal
    "Radagon's Scarseal",
    "Marika's Scarseal",
    # Scorpion Charm
    "Magic Scorpion Charm",
    "Lightning Scorpion Charm",
    "Fire Scorpion Charm",
    "Sacred Scorpion Charm",
    # Crucible
    "Crucible Scale Talisman",
    "Crucible Feather Talisman",
    "Crucible Knot Talisman",
    "Fine Crucible Feather Talisman",
    "Talisman of All Crucibles",
)


def build_talismans(catalog: ItemCatalog) -> tuple[Item, ...]:
    """Return one row per shortlisted talisman, in shortlist order, or raise `BuildError`."""
    known = set(catalog.names["accessory"].values())
    unknown = sorted(name for name in SHORTLIST if name not in known)
    if unknown:
        raise BuildError(f"talisman shortlist names unknown item(s): {', '.join(unknown)}")
    return tuple(new_item(name, "talisman") for name in SHORTLIST)
