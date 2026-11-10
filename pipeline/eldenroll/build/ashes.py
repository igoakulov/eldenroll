"""An ash only ever rolls as part of a weapon slot, so the canonical name drops the source's `Ash of
War: ` prefix (`data/README.md#Ashes`). The ashes the mod has only attached to a weapon are added by
name.

`alias` and `image` stay at their defaults here; later steps fill them in.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping

from eldenroll.build.items import canonical_names, new_item
from eldenroll.errors import BuildError
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import ItemCatalog
from eldenroll.model.name_variant import NameVariant

_PREFIX = "Ash of War: "
EXCLUDED: frozenset[str] = frozenset(
    {"Kick", "Lifesteal Fist", "White Shadow's Lure", "Assassin's Gambit"}
)


def build_ashes(
    catalog: ItemCatalog, variants: Mapping[str, NameVariant], added_names: Iterable[str]
) -> tuple[Item, ...]:
    source = canonical_names(catalog, "gems", "gem", variants)
    unprefixed = sorted(name for name in source if not name.startswith(_PREFIX))
    if unprefixed:
        raise BuildError(f"ash name(s) without the prefix: {', '.join(unprefixed)}")
    names = tuple(name.removeprefix(_PREFIX) for name in source)
    unknown = sorted(EXCLUDED - set(names))
    if unknown:
        raise BuildError(f"ash exclusion(s) name no ash: {', '.join(unknown)}")
    added = tuple(added_names)
    repeated = sorted(set(added) & set(names))
    if repeated:
        raise BuildError(f"added ash(es) already in the group: {', '.join(repeated)}")
    kept = (name for name in names if name not in EXCLUDED)
    return tuple(new_item(name, "ash") for name in (*kept, *added))
