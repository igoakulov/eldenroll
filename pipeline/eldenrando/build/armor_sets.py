"""The join is strict: a name that is no armor piece, a second piece in one slot or two sets with
one id all stop the build. An armor piece no set names is fine, because it stays a row that
cannot roll (`data.md` §1.1).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence

from eldenrando.errors import BuildError
from eldenrando.model.armor_set import ArmorSet
from eldenrando.model.item import Item
from eldenrando.model.vocabulary import ARMOR_SLOTS
from eldenrando.normalize.slug import slugify


def build_armor_sets(
    sets: Mapping[str, Sequence[str]], table: Iterable[Item]
) -> tuple[ArmorSet, ...]:
    armor = {row.name: row for row in table if row.category == "armor"}
    seen: dict[str, str] = {}
    out: list[ArmorSet] = []
    for name, pieces in sets.items():
        set_id = slugify(name)
        if set_id in seen:
            raise BuildError(f"{name!r} and {seen[set_id]!r} share the id {set_id!r}")
        seen[set_id] = name
        out.append(ArmorSet(id=set_id, name=name, pieces=_link_pieces(name, pieces, armor)))
    return tuple(out)


def _link_pieces(
    name: str, pieces: Sequence[str], armor: Mapping[str, Item]
) -> tuple[str, ...]:
    unknown = sorted(piece for piece in pieces if piece not in armor)
    if unknown:
        raise BuildError(f"{name!r} names no armor piece called: {', '.join(unknown)}")
    by_slot: dict[str | None, Item] = {}
    for piece in pieces:
        row = armor[piece]
        held = by_slot.setdefault(row.subcategory, row)
        if held is not row:
            raise BuildError(
                f"{name!r} holds {held.name!r} and {row.name!r} in slot {row.subcategory}"
            )
    return tuple(by_slot[slot].id for slot in ARMOR_SLOTS if slot in by_slot)
