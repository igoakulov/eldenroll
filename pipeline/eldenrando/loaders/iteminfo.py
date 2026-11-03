"""Load `item_info.yaml` into an `ItemCatalog` lookup."""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.schema import (
    check_keys,
    get_category_int_maps,
    get_id_name_maps,
    get_integer,
    get_optional_integer,
    get_str_int_map_optional,
    get_string_list,
    require_integer,
    require_mapping,
    require_sequence,
    require_string,
)
from eldenrando.loaders.yaml_source import load_mapping
from eldenrando.model.item_catalog import CatalogGroup, CatalogLocation, ItemCatalog

_GROUP_FIELDS = frozenset({"Items", "ItemCount", "LocationCount", "UniqueCount"})
_LOCATION_FIELDS = frozenset({"Tags", "Count", "Locations", "RealCount"})


def load_item_catalog(path: Path) -> ItemCatalog:
    """Return the catalog described by an iteminfo document."""
    document = load_mapping(path)
    return ItemCatalog(
        names=get_id_name_maps(document, "ItemNames", "iteminfo"),
        counts=get_category_int_maps(document, "ItemCounts", "iteminfo"),
        unique_counts=get_category_int_maps(document, "UniqueCounts", "iteminfo"),
        groups=_parse_groups(document),
        locations=_parse_locations(document),
    )


def _parse_groups(document: dict[object, object]) -> dict[str, CatalogGroup]:
    """Return the item groups keyed by group name."""
    entries = require_mapping(document.get("ItemGroups"), "ItemGroups")
    out: dict[str, CatalogGroup] = {}
    for raw_name, raw_group in entries.items():
        name = require_string(raw_name, "ItemGroups key")
        where = f"ItemGroups.{name}"
        group = require_mapping(raw_group, where)
        check_keys(group, _GROUP_FIELDS, where)
        items = require_mapping(group.get("Items"), f"{where}.Items")
        out[name] = CatalogGroup(
            name=name,
            items={
                require_string(category, f"{where}.Items key"): _parse_ids(
                    value, f"{where}.Items.{category}"
                )
                for category, value in items.items()
            },
            item_count=get_integer(group, "ItemCount", where),
            location_count=get_integer(group, "LocationCount", where),
            unique_count=get_integer(group, "UniqueCount", where),
        )
    return out


def _parse_ids(value: object, where: str) -> tuple[int, ...]:
    """Return a list of integer ids."""
    return tuple(
        require_integer(entry, f"{where}[{index}]")
        for index, entry in enumerate(require_sequence(value, where))
    )


def _parse_locations(document: dict[object, object]) -> tuple[CatalogLocation, ...]:
    """Return the prose location entries."""
    out: list[CatalogLocation] = []
    for index, raw_entry in enumerate(require_sequence(document.get("Locations"), "Locations")):
        where = f"Locations[{index}]"
        entry = require_mapping(raw_entry, where)
        check_keys(entry, _LOCATION_FIELDS, where)
        out.append(
            CatalogLocation(
                tags=get_string_list(entry, "Tags", where),
                count=get_integer(entry, "Count", where),
                real_count=get_optional_integer(entry, "RealCount", where),
                descriptions=get_str_int_map_optional(entry, "Locations", where),
            )
        )
    return tuple(out)
