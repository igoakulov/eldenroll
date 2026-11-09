"""The bonus is on by default and off for the classes in `prd.md` §6.4. `str_bonus_2h.csv` names the
weapons that differ from their class: paired weapons outside those classes, and the two
exceptions `Grafted Dragon` and `Starscourge Greatsword`. Every other category keeps its null,
and `none` keeps its `false`.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import replace

from eldenroll.errors import BuildError
from eldenroll.model.item import Item
from eldenroll.model.vocabulary import NO_STR_BONUS


def assign_str_bonus(items: Iterable[Item], overrides: Mapping[str, bool]) -> tuple[Item, ...]:
    rows = tuple(items)
    weapons = {row.name for row in rows if row.category in ("weapon", "shield")}
    unknown = sorted(set(overrides) - weapons)
    if unknown:
        raise BuildError(f"two-handed bonus override(s) name no weapon: {', '.join(unknown)}")
    return tuple(
        replace(row, str_bonus_2h=overrides.get(row.name, row.subcategory not in NO_STR_BONUS))
        if row.category in ("weapon", "shield")
        else row
        for row in rows
    )
