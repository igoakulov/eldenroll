"""`armors.json` names the slot of the pieces it holds. It is base-game data, so the rest come from
`armor_slots.csv`. A piece named by both, or by neither, stops the build, so the two sources can
never quietly disagree.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import replace

from eldenroll.errors import BuildError
from eldenroll.model.item import Item
from eldenroll.model.name_variant import NameVariant

_ALTERED_SUFFIX = " (altered)"
_JSON_SLOTS: Mapping[str, str] = {
    "Helm": "head",
    "Chest Armor": "body",
    "Gauntlets": "arms",
    "Gauntlet": "arms",
    "Leg Armor": "legs",
}


def assign_armor_slots(
    armor: Iterable[Item],
    records: Iterable[Mapping[str, object]],
    variants: Mapping[str, NameVariant],
    overrides: Mapping[str, str],
) -> tuple[Item, ...]:
    rows = tuple(armor)
    recorded = _recorded_slots(records, variants)
    names = {row.name for row in rows}
    unknown = sorted(set(overrides) - names)
    if unknown:
        raise BuildError(f"armor slot override(s) name no piece: {', '.join(unknown)}")
    both = sorted(name for name in overrides if name.casefold() in recorded)
    if both:
        raise BuildError(f"armors.json already gives the slot of: {', '.join(both)}")
    slots = {
        row.name: overrides.get(row.name, recorded.get(row.name.casefold(), "")) for row in rows
    }
    missing = sorted(name for name, slot in slots.items() if not slot)
    if missing:
        raise BuildError(f"armor piece(s) with no slot: {', '.join(missing)}")
    return tuple(replace(row, subcategory=slots[row.name]) for row in rows)


def _recorded_slots(
    records: Iterable[Mapping[str, object]], variants: Mapping[str, NameVariant]
) -> dict[str, str]:
    """Return `{casefolded piece name: slot}`."""
    out: dict[str, str] = {}
    for record in records:
        variant = variants.get(str(record["id"]))
        name = str(record["name"]) if variant is None else variant.canonical_name
        key = name.casefold().removesuffix(_ALTERED_SUFFIX)
        slot = _JSON_SLOTS.get(str(record["category"]))
        if slot is None:
            raise BuildError(f"{name}: unknown armor category {record['category']!r}")
        if out.setdefault(key, slot) != slot:
            raise BuildError(f"{name}: armors.json gives it both {out[key]} and {slot}")
    return out
