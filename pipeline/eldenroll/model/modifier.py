from __future__ import annotations

from dataclasses import dataclass

from eldenroll.model.selector import Selector


@dataclass(frozen=True, slots=True)
class RolledCondition:
    """What one slot rolled matches a selector or, when `negated`, does not."""

    slot: str
    selector: Selector
    negated: bool = False


@dataclass(frozen=True, slots=True)
class CharacterClassCondition:
    """The rolled character class is one of these; they are a fixed list, so this is no selector."""

    character_classes: tuple[str, ...]


Condition = RolledCondition | CharacterClassCondition


@dataclass(frozen=True, slots=True)
class Modifier:
    """Conditions are ANDed, and a value of 0 removes the target."""

    id: str
    when: tuple[Condition, ...]
    target: Selector
    value: float
