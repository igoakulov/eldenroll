"""A label names a map tile, and one tile can hold several areas. A label with no alias row is
reported, never guessed or silently dropped.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from eldenroll.errors import BuildError

NON_PLACE_LABELS: frozenset[str] = frozenset({"Spirit Summon", "Unused"})


@dataclass(frozen=True, slots=True)
class LabelResolution:
    resolved: dict[str, str]
    unresolved: tuple[str, ...]
    non_places: tuple[str, ...]


def resolve_labels(labels: Iterable[str], aliases: Mapping[str, str]) -> LabelResolution:
    distinct = set(labels)
    places = distinct - NON_PLACE_LABELS
    return LabelResolution(
        resolved={label: aliases[label] for label in sorted(places & aliases.keys())},
        unresolved=tuple(sorted(places - aliases.keys())),
        non_places=tuple(sorted(distinct & NON_PLACE_LABELS)),
    )


def resolve_boss_location(
    boss: str,
    label: str,
    aliases: Mapping[str, str],
    overrides: Mapping[tuple[str, str], str],
) -> str:
    override = overrides.get((boss, label))
    if override is not None:
        return override
    location_id = aliases.get(label)
    if location_id is None:
        raise BuildError(f"boss {boss!r} has no alias for label {label!r}")
    return location_id
