"""`boss_merges.csv` joins the pairs that are one fight, `boss_names.csv` corrects the names of the
rest, `boss_additions.csv` adds the fights the CSV leaves untagged, and `boss_odds.csv` sets the
odds that are not 1. Every merge, name and odds row must apply, so a source change that orphans
one stops the build instead of quietly changing the pool.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from eldenroll.build.location_labels import resolve_boss_location
from eldenroll.errors import BuildError
from eldenroll.model.boss_instance import BossInstance
from eldenroll.normalize.slug import slugify

BOSS_TAG = "[Boss]"
DLC_TAG = "[DLC] "
_PARENTHETICAL = re.compile(r"\([^)]*\)")
_BROKEN = re.compile(r"\s*-\s*Broken\s*$")
_SPACES = re.compile(r"\s+")


@dataclass(frozen=True, slots=True)
class BossOverrides:
    merges: Mapping[tuple[str, str], tuple[str, str]]
    names: Mapping[tuple[str, str], str]
    additions: Sequence[tuple[str, str, str]]
    aliases: Mapping[str, str]
    locations: Mapping[tuple[str, str], str]
    odds: Mapping[str, float]


def boss_identity(name: str) -> str:
    """Return a CSV name without its tag, every parenthetical and a trailing `- Broken`."""
    plain = _PARENTHETICAL.sub("", name.replace(BOSS_TAG, ""))
    return _SPACES.sub(" ", _BROKEN.sub("", plain.strip())).strip()


def boss_pairs(rows: Iterable[tuple[str, str]]) -> tuple[tuple[str, str], ...]:
    pairs = ((label, boss_identity(name)) for label, name in rows if BOSS_TAG in name)
    return tuple(dict.fromkeys(pairs))


def build_boss_instances(
    rows: Iterable[tuple[str, str]], overrides: BossOverrides
) -> tuple[BossInstance, ...]:
    pairs = boss_pairs(rows)
    _check_merges(pairs, overrides.merges)
    _check_names(pairs, overrides)
    # A fight is keyed on its final name, so the rows of one merge land on one entry, located by
    # the row that holds the instance's label, else by the first of them.
    fights: dict[tuple[str, str], str] = {}
    for label, identity in pairs:
        name, instance_label = overrides.merges.get(
            (label, identity), (_corrected(identity, label, overrides), "")
        )
        location = resolve_boss_location(identity, label, overrides.aliases, overrides.locations)
        fight = (instance_label or label, name)
        if label == instance_label:
            fights[fight] = location
        else:
            fights.setdefault(fight, location)
    for name, label, location_id in overrides.additions:
        if (label, name) in fights:
            raise BuildError(f"boss_additions: {name!r} on {label!r} is already in the pool")
        fights[(label, name)] = location_id
    return _instances(fights, overrides.odds)


def _corrected(identity: str, label: str, overrides: BossOverrides) -> str:
    """Return the owner's name for an unmerged pair, else the CSV's identity."""
    names = overrides.names
    return names.get((identity, label)) or names.get((identity, "")) or identity


def _instances(
    fights: Mapping[tuple[str, str], str], odds: Mapping[str, float]
) -> tuple[BossInstance, ...]:
    seen: set[str] = set()
    out: list[BossInstance] = []
    for (label, name), location_id in fights.items():
        location_label = label.removeprefix(DLC_TAG)
        instance_id = f"{slugify(name)}_{slugify(location_label)}"
        if instance_id in seen:
            raise BuildError(f"two boss instances share the id {instance_id!r}")
        seen.add(instance_id)
        out.append(
            BossInstance(
                id=instance_id,
                name=name,
                location_id=location_id,
                location_label=location_label,
                odds=odds.get(instance_id, 1),
            )
        )
    unknown = sorted(set(odds) - seen)
    if unknown:
        raise BuildError(f"boss_odds names no boss: {', '.join(unknown)}")
    return tuple(out)


def _check_merges(
    pairs: tuple[tuple[str, str], ...], merges: Mapping[tuple[str, str], tuple[str, str]]
) -> None:
    unknown = sorted(f"{name} on {label}" for label, name in set(merges) - set(pairs))
    if unknown:
        raise BuildError(f"boss_merges names no CSV boss: {', '.join(unknown)}")
    fights: dict[tuple[str, str], int] = {}
    for (label, _), (instance, instance_label) in merges.items():
        fight = (instance_label or label, instance)
        fights[fight] = fights.get(fight, 0) + 1
    single = sorted(f"{name} on {label}" for (label, name), count in fights.items() if count < 2)
    if single:
        raise BuildError(f"boss_merges joins nothing for: {', '.join(single)}")


def _check_names(pairs: tuple[tuple[str, str], ...], overrides: BossOverrides) -> None:
    unmerged = [pair for pair in pairs if pair not in overrides.merges]
    identities = {identity for _, identity in unmerged}
    unused = sorted(
        f"{name} on {label or 'every label'}"
        for name, label in overrides.names
        if (name not in identities if not label else (label, name) not in unmerged)
    )
    if unused:
        raise BuildError(f"boss_names corrects no CSV boss: {', '.join(unused)}")
