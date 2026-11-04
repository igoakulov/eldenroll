from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.schema import (
    check_keys,
    get_optional_string,
    get_string,
    get_string_list,
    get_words,
    require_mapping,
    require_sequence,
)
from eldenrando.loaders.yaml_source import load_mapping
from eldenrando.model.annotations import AnnotationConfig, Area, GameEvent

_AREA_FIELDS = frozenset(
    {"Name", "Text", "Req", "Maps", "MainMaps", "Tags", "Comment", "Until", "MapNames"}
)
_EVENT_FIELDS = frozenset({"Name", "Text", "Req"})


def load_annotations(path: Path) -> AnnotationConfig:
    document = load_mapping(path)
    areas = tuple(
        _parse_area(entry, f"Areas[{index}]")
        for index, entry in enumerate(require_sequence(document.get("Areas"), "Areas"))
    )
    events = tuple(
        _parse_event(entry, f"Events[{index}]")
        for index, entry in enumerate(require_sequence(document.get("Events"), "Events"))
    )
    return AnnotationConfig(areas=areas, events=events)


def _parse_area(entry: object, where: str) -> Area:
    mapping = require_mapping(entry, where)
    check_keys(mapping, _AREA_FIELDS, where)
    return Area(
        name=get_string(mapping, "Name", where),
        text=get_string(mapping, "Text", where),
        req=get_optional_string(mapping, "Req", where),
        maps=get_words(mapping, "Maps", where),
        main_maps=get_words(mapping, "MainMaps", where),
        tags=get_words(mapping, "Tags", where),
        until=get_optional_string(mapping, "Until", where),
        comment=get_optional_string(mapping, "Comment", where),
        map_names=get_string_list(mapping, "MapNames", where),
    )


def _parse_event(entry: object, where: str) -> GameEvent:
    mapping = require_mapping(entry, where)
    check_keys(mapping, _EVENT_FIELDS, where)
    return GameEvent(
        name=get_string(mapping, "Name", where),
        req=get_string(mapping, "Req", where),
        text=get_optional_string(mapping, "Text", where),
    )
