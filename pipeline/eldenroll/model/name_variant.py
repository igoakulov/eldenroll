"""`by_name` marks a row that placement may also apply where a source gives no id. Most rows must
stay id-only, because their source name can be another item's real name.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NameVariant:
    source_id: str
    source_name: str
    canonical_name: str
    by_name: bool = False
