"""A gap is a source fact the build can't use as it stands: a missing or broken stat record, a
weapon the unique-skill sheet can't settle, an ash or weapon class the ash sheet lacks, a
remembrance whose boss nothing names. Each one must be answered by a row in its override file.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Gap:
    area: str
    item: str
    problem: str

    @property
    def key(self) -> tuple[str, str]:
        return (self.area, self.item)
