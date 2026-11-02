"""Weapon and shield rows, from the mod's weapon group and the weapon class sheet.

Membership starts from the group, never from the sheet, because the sheet also lists `Unarmed`.
The sheet's class decides `category` and `subcategory`, including where the JSON disagrees
(owner decision). The join is strict: a weapon without a class, a sheet name that is no weapon,
or a name with two classes all stop the build instead of dropping a row.

`infusable`, `str_bonus_2h`, the requirements and `image` stay at their defaults here; later
steps fill them in and validation enforces them.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping

from eldenrando.build.items import canonical_names, new_item
from eldenrando.errors import BuildError
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.model.item import Category, Item
from eldenrando.model.item_catalog import ItemCatalog
from eldenrando.model.name_variant import NameVariant
from eldenrando.normalize.slug import slugify

_SHIELD_CLASSES: frozenset[str] = frozenset({"small_shield", "medium_shield", "greatshield"})
_NOT_A_ROW: frozenset[str] = frozenset({"Unarmed"})


def build_weapons(
    catalog: ItemCatalog,
    variants: Mapping[str, NameVariant],
    added_names: Iterable[str],
    classes: CsvTable,
) -> tuple[Item, ...]:
    """Return one row per weapon and shield, group order first, or raise `BuildError`."""
    names = (*canonical_names(catalog, "weapons", "weapon", variants), *added_names)
    subcategories = _subcategories(classes)
    unknown = sorted(set(subcategories) - set(names) - _NOT_A_ROW)
    if unknown:
        raise BuildError(f"weapon sheet names unknown weapon(s): {', '.join(unknown)}")
    missing = sorted(set(names) - set(subcategories))
    if missing:
        raise BuildError(f"weapon(s) with no class: {', '.join(missing)}")
    return tuple(_row(name, subcategories[name]) for name in names)


def _subcategories(classes: CsvTable) -> dict[str, str]:
    """Return `{weapon name: class slug}`, skipping the sheet's blank separator rows."""
    class_column = classes.column("Weapon Class")
    weapon_column = classes.column("Weapon")
    out: dict[str, str] = {}
    for row in classes.rows:
        name = row[weapon_column]
        if not name:
            continue
        if name in out:
            raise BuildError(f"weapon sheet repeats {name!r}")
        subcategory = slugify(row[class_column])
        if not subcategory:
            raise BuildError(f"weapon sheet gives {name!r} no class")
        out[name] = subcategory
    return out


def _row(name: str, subcategory: str) -> Item:
    """Return the row for one weapon or shield."""
    category: Category = "shield" if subcategory in _SHIELD_CLASSES else "weapon"
    return new_item(name, category, subcategory=subcategory)
