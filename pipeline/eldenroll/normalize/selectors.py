"""A source may name a subcategory group such as `melee`, and the stored selector is the expanded id
list, so nothing downstream knows the groups. An empty list means every option, the same as null.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Final

from eldenroll.errors import BuildError
from eldenroll.model.selector import SELECTOR_KINDS, Selector, SelectorKind
from eldenroll.model.vocabulary import SUBCATEGORY_GROUPS

_KINDS: Final[Mapping[str, SelectorKind]] = {kind: kind for kind in SELECTOR_KINDS}


def new_selector(kind: str, ids: Iterable[str] | None) -> Selector:
    known = _KINDS.get(kind)
    if known is None:
        raise BuildError(f"unknown selector kind: {kind}")
    listed = set(ids or ())
    if not listed:
        return Selector(known, None)
    if known == "subcategory":
        listed = {one for name in listed for one in SUBCATEGORY_GROUPS.get(name, {name})}
    return Selector(known, tuple(sorted(listed)))
