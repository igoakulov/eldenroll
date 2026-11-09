"""A row is written field by field, so a field the model lacks cannot ship. Tables built through
sets are sorted, so that two runs give the same bytes. One row sits on one line, so a data change
shows as a small diff.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Final, cast

from eldenroll.model.database import Database
from eldenroll.model.modifier import CharacterClassCondition, Condition, Modifier
from eldenroll.model.selector import Selector

Row = Mapping[str, object]

TABLE_FIELDS: Final[Mapping[str, tuple[str, ...]]] = {
    "region": ("id", "name", "region_level"),
    "location": ("id", "name", "region_id"),
    "boss_instance": ("id", "name", "location_id", "location_label", "odds"),
    "item": (
        "id",
        "name",
        "category",
        "subcategory",
        "infusable",
        "str_bonus_2h",
        "alias",
        "image",
        "str",
        "dex",
        "int",
        "fth",
        "arc",
        "odds",
    ),
    "armor_set": ("id", "name", "pieces", "odds"),
    "ash_compatibility": ("ash_id", "category", "subcategory"),
    "combat_rule": ("id", "name", "odds"),
    "character_class": ("id", "name", "odds"),
    "slot_pool": ("character_class_id", "slot", "selectors"),
    "alias": ("id", "label"),
    "item_location": ("item_id", "location_id", "boss_instance_id"),
    "modifier": ("id", "when", "target", "value"),
}


def database_rows(database: Database) -> Mapping[str, Sequence[Row]]:
    return {
        "region": [
            {"id": row.id, "name": row.name, "region_level": row.region_level}
            for row in database.regions
        ],
        "location": [
            {"id": row.id, "name": row.name, "region_id": row.region_id}
            for row in database.locations
        ],
        "boss_instance": [
            {
                "id": row.id,
                "name": row.name,
                "location_id": row.location_id,
                "location_label": row.location_label,
                "odds": _number(row.odds),
            }
            for row in database.bosses
        ],
        "item": [{**row.to_row(), "odds": _number(row.odds)} for row in database.items],
        "armor_set": [
            {"id": row.id, "name": row.name, "pieces": list(row.pieces), "odds": _number(row.odds)}
            for row in database.armor_sets
        ],
        "ash_compatibility": [
            {"ash_id": row.ash_id, "category": row.category, "subcategory": row.subcategory}
            for row in sorted(
                database.ash_compatibility,
                key=lambda one: (one.ash_id, one.category, one.subcategory or ""),
            )
        ],
        "combat_rule": [
            {
                "id": row.id,
                "name": row.name,
                "odds": _number(row.odds),
            }
            for row in database.rules
        ],
        "character_class": [
            {"id": row.id, "name": row.name, "odds": _number(row.odds)}
            for row in database.character_classes
        ],
        "slot_pool": [
            {
                "character_class_id": row.character_class_id,
                "slot": row.slot,
                "selectors": [_selector(one) for one in row.selectors],
            }
            for row in database.slot_pools
        ],
        "alias": [{"id": row.id, "label": row.label} for row in database.aliases],
        "item_location": [
            {
                "item_id": row.item_id,
                "location_id": row.location_id,
                "boss_instance_id": row.boss_instance_id,
            }
            for row in sorted(
                database.item_locations,
                key=lambda one: (one.item_id, one.location_id or "", one.boss_instance_id or ""),
            )
        ],
        "modifier": [_modifier(row) for row in database.modifiers],
    }


def render(tables: Mapping[str, object]) -> str:
    parts = [f"{json.dumps(name)}: {_render_value(value)}" for name, value in tables.items()]
    return "{\n" + ",\n".join(parts) + "\n}\n"


def _render_value(value: object) -> str:
    if isinstance(value, Sequence) and not isinstance(value, str):
        rows = [_dumps(row) for row in cast("Sequence[object]", value)]
        return "[\n" + ",\n".join(rows) + "\n]" if rows else "[]"
    return _dumps(value)


def _dumps(value: object) -> str:
    """Return one row as JSON, keeping accented names readable."""
    return json.dumps(value, ensure_ascii=False)


def _number(value: float) -> int | float:
    """Return a whole number as an integer, so that odds of 1 read as 1."""
    return int(value) if value == int(value) else value


def _selector(selector: Selector) -> Row:
    return {"kind": selector.kind, "ids": None if selector.ids is None else list(selector.ids)}


def _condition(condition: Condition) -> Row:
    if isinstance(condition, CharacterClassCondition):
        return {"kind": "character_class", "ids": list(condition.character_classes)}
    return {
        "kind": "rolled",
        "slot": condition.slot,
        "selector": _selector(condition.selector),
        "negated": condition.negated,
    }


def _modifier(row: Modifier) -> Row:
    return {
        "id": row.id,
        "when": [_condition(one) for one in row.when],
        "target": _selector(row.target),
        "value": _number(row.value),
    }
