"""One correction to a source name, keyed by the id of the record it applies to."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NameVariant:
    """A source record's name and the canonical name that replaces it."""

    source_id: str
    source_name: str
    canonical_name: str
