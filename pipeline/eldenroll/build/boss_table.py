from __future__ import annotations

from pathlib import Path

from eldenroll.build.boss_locations import with_locations
from eldenroll.build.bosses import BossOverrides, build_boss_instances
from eldenroll.loaders.annotations import load_annotations
from eldenroll.loaders.boss_overrides import (
    load_boss_additions,
    load_boss_landmarks,
    load_boss_merges,
    load_boss_names,
    load_boss_odds,
    load_location_display,
)
from eldenroll.loaders.bosses import load_boss_creature_locations
from eldenroll.loaders.location_aliases import (
    load_boss_location_overrides,
    load_location_aliases,
)
from eldenroll.model.boss_instance import BossInstance
from eldenroll.paths import AREAS, ENEMY_LOCATIONS


def load_boss_rows() -> tuple[tuple[str, str], ...]:
    table = load_boss_creature_locations(ENEMY_LOCATIONS)
    label = table.column("Location")
    name = table.column("Name")
    return tuple((row[label], row[name]) for row in table.rows)


def load_boss_overrides(overrides: Path) -> BossOverrides:
    location_ids = {area.name for area in load_annotations(AREAS).areas}
    aliases = load_location_aliases(overrides / "location_aliases.csv", location_ids=location_ids)
    return BossOverrides(
        merges=load_boss_merges(overrides / "boss_merges.csv"),
        names=load_boss_names(overrides / "boss_names.csv"),
        additions=load_boss_additions(overrides / "boss_additions.csv", location_ids=location_ids),
        aliases=aliases,
        locations=load_boss_location_overrides(
            overrides / "boss_location_overrides.csv", labels=aliases, location_ids=location_ids
        ),
        odds=load_boss_odds(overrides / "boss_odds.csv"),
    )


def load_boss_instances(overrides: Path) -> tuple[BossInstance, ...]:
    areas = load_annotations(AREAS).areas
    names = {area.name: area.text for area in areas}
    return with_locations(
        build_boss_instances(load_boss_rows(), load_boss_overrides(overrides)),
        names,
        load_location_display(overrides / "location_display.csv", location_ids=names),
        load_boss_landmarks(overrides / "boss_landmarks.csv"),
    )
