"""One modifier row: when its conditions hold, multiply its target's odds (`prd.md` §8.4)."""

from __future__ import annotations

from dataclasses import dataclass

from eldenrando.model.selector import Selector


@dataclass(frozen=True, slots=True)
class RolledCondition:
    """What one slot rolled matches a selector or, when `negated`, does not."""

    slot: str
    selector: Selector
    negated: bool = False


@dataclass(frozen=True, slots=True)
class BuildCondition:
    """The rolled build is one of these; builds are a fixed list, so this is no selector."""

    builds: tuple[str, ...]


Condition = RolledCondition | BuildCondition


@dataclass(frozen=True, slots=True)
class Modifier:
    """Conditions are ANDed, and a value of 0 removes the target."""

    id: str
    when: tuple[Condition, ...]
    target: Selector
    value: float
