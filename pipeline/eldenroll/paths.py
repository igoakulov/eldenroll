"""Sources are grouped by what they are used for, so this is the one place that knows the layout."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "data" / "sources"

LOCATIONS_DIR = SOURCES / "locations"
AREAS = LOCATIONS_DIR / "areas.yaml"
SUBMAPS = LOCATIONS_DIR / "submaps.yaml"

PLACEMENT_DIR = SOURCES / "placement"
ITEM_SLOTS = PLACEMENT_DIR / "item_slots.yaml"
ENEMY_DROPS = PLACEMENT_DIR / "enemy_drops.csv"
ENEMY_ITEM_LOTS = PLACEMENT_DIR / "enemy_item_lots.csv"

ENEMY_LOCATIONS = SOURCES / "bosses" / "enemy_locations.csv"

ITEMS_DIR = SOURCES / "items"
ITEM_INFO = ITEMS_DIR / "item_info.yaml"
WEAPON_SHIELD_CLASSES = ITEMS_DIR / "weapon_shield_classes.csv"
TOOL_CONSUMABLE_CLASSES = ITEMS_DIR / "tool_consumable_classes.csv"
ASH_WEAPON_MATRIX = ITEMS_DIR / "ash_weapon_matrix.csv"
WEAPON_SKILLS = ITEMS_DIR / "weapon_skills.csv"

ARMOR_DIR = SOURCES / "armor"
