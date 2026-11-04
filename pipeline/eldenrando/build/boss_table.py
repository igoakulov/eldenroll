from __future__ import annotations

from pathlib import Path

from eldenrando.build.bosses import BossOverrides, build_boss_instances
from eldenrando.loaders.annotations import load_annotations
from eldenrando.loaders.boss_overrides import (
    load_boss_additions,
    load_boss_merges,
    load_boss_names,
    load_boss_odds,
)
from eldenrando.loaders.bosses import load_boss_creature_locations
from eldenrando.loaders.location_aliases import (
    load_boss_location_overrides,
    load_location_aliases,
)
from eldenrando.model.boss_instance import BossInstance
from eldenrando.paths import AREAS, ENEMY_LOCATIONS


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
    return build_boss_instances(load_boss_rows(), load_boss_overrides(overrides))
