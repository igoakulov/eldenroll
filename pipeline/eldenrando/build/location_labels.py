"""Resolve CSV micro-location labels to locations through the alias table.

A label with no alias row is reported, never guessed or silently dropped. A label naming
several micro-locations holds the area of the first one (`data.md` §6.3), so those labels
are listed for review.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

MICRO_LOCATION_SEPARATOR: str = ";"


@dataclass(frozen=True, slots=True)
class LabelResolution:
    """The labels that resolved to a location, and the ones to report."""

    resolved: dict[str, str]
    unresolved: tuple[str, ...]


def resolve_labels(labels: Iterable[str], aliases: Mapping[str, str]) -> LabelResolution:
    """Return each distinct label's location, with the misses sorted for the report."""
    distinct = set(labels)
    return LabelResolution(
        resolved={label: aliases[label] for label in sorted(distinct & aliases.keys())},
        unresolved=tuple(sorted(distinct - aliases.keys())),
    )


def labels_for_review(aliases: Mapping[str, str]) -> tuple[str, ...]:
    """Return the sorted labels naming several micro-locations."""
    return tuple(sorted(label for label in aliases if MICRO_LOCATION_SEPARATOR in label))
