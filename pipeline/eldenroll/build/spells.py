"""Offensive spells only (`data/README.md#Scope`).

`alias`, `image` and the requirements stay at their defaults here; later steps fill them in.
"""

from __future__ import annotations

from collections.abc import Mapping

from eldenroll.build.items import canonical_names, new_item
from eldenroll.errors import BuildError
from eldenroll.model.item import Category, Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.model.name_variant import NameVariant

EXCLUDED_SORCERIES: frozenset[str] = frozenset(
    {
        "Carian Retaliation",
        "Cherishing Fingers",
        "Eternal Darkness",
        "Fia's Mist",
        "Freezing Mist",
        "Frozen Armament",
        "Lucidity",
        "Mantle of Thorns",
        "Miriam's Vanishing",
        "Night Maiden's Mist",
        "Scholar's Armament",
        "Scholar's Shield",
        "Starlight",
        "Terra Magica",
        "Thops's Barrier",
        "Unseen Blade",
        "Unseen Form",
    }
)


EXCLUDED_INCANTATIONS: frozenset[str] = frozenset(
    {
        "Assassin's Approach",
        "Barrier of Gold",
        "Bestial Vitality",
        "Black Flame Blade",
        "Black Flame's Protection",
        "Blessing of the Erdtree",
        "Blessing's Boon",
        "Bloodflame Blade",
        "Bloodflame Talons",
        "Darkness",
        "Divine Fortification",
        "Dragonbolt Blessing",
        "Dragonbolt of Florissax",
        "Electrify Armament",
        "Flame Fortification",
        "Flame, Grant Me Strength",
        "Flame, Protect Me",
        "Golden Lightning Fortification",
        "Golden Vow (Incantation)",
        "Immutable Shield",
        "Law of Causality",
        "Lightning Fortification",
        "Lord's Divine Fortification",
        "Magic Fortification",
        "Order's Blade",
        "Poison Armament",
        "Protection of the Erdtree",
        "Vyke's Dragonbolt",
        "Bestial Constitution",
        "Cure Poison",
        "Erdtree Heal",
        "Flame, Cleanse Me",
        "Great Heal",
        "Heal",
        "Heal from Afar",
        "Law of Regression",
        "Lord's Aid",
        "Lord's Heal",
        "Minor Erdtree",
        "Order Healing",
        "Urgent Heal",
        "Rejection",
        "Shadow Bait",
    }
)


def build_sorceries(catalog: ItemCatalog, variants: Mapping[str, NameVariant]) -> tuple[Item, ...]:
    return _spells(catalog, "sorceries", "sorcery", EXCLUDED_SORCERIES, variants)


def build_incantations(
    catalog: ItemCatalog, variants: Mapping[str, NameVariant]
) -> tuple[Item, ...]:
    return _spells(catalog, "incantations", "incantation", EXCLUDED_INCANTATIONS, variants)


def _spells(
    catalog: ItemCatalog,
    group: str,
    category: Category,
    excluded: frozenset[str],
    variants: Mapping[str, NameVariant],
) -> tuple[Item, ...]:
    names = canonical_names(catalog, group, "goods", variants)
    unknown = sorted(excluded - set(names))
    if unknown:
        raise BuildError(f"{category} exclusion(s) name no {category}: {', '.join(unknown)}")
    return tuple(new_item(name, category) for name in names if name not in excluded)
