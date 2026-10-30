"""Grace and boss hints from `hintmarks.txt`.

The file groups 129 areas of the map into hint regions. Fields are sparser than they look:
`MainBonfire` is missing on 4 groups, `Boss` is an entity id on 83 groups and an event name
on 28, and `Includes` is a space-separated string rather than a YAML list.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GraceGroup:
    """A hint region: the areas it covers and the bonfire it is named after."""

    includes: tuple[str, ...]
    main_bonfire: str | None
    boss: int | str | None
    parent: str | None
    bonfires: str | None
    display_name: str | None
    comment: str | None
    boss_flag: int | None


@dataclass(frozen=True, slots=True)
class HintItem:
    """A key item whose hint is shown only once its area has been explored."""

    name: str
    unexplored_check: str | None
    reqs: tuple[dict[str, str | int], ...]
    comment: str | None
    display_name: str | None
    multi_name: str | None


@dataclass(frozen=True, slots=True)
class HintUpgrade:
    """A group of upgrade items sharing one hint; the source writes `Name` or `Names`."""

    names: tuple[str, ...]
    comment: str | None


@dataclass(frozen=True, slots=True)
class Hintmarks:
    """The modelled sections of `hintmarks.txt`."""

    debug_info: tuple[str, ...]
    enable_flag: int
    groups: tuple[GraceGroup, ...]
    items: tuple[HintItem, ...]
    upgrades: tuple[HintUpgrade, ...]
