"""Load `hintmarks.txt` into `Hintmarks`."""

from __future__ import annotations

from pathlib import Path

from eldenrando.loaders.schema import (
    check_keys,
    get_integer,
    get_optional_integer,
    get_optional_scalar,
    get_optional_string,
    get_scalar_maps,
    get_string,
    get_words,
    require_mapping,
    require_sequence,
    require_string,
)
from eldenrando.loaders.yaml_source import load_mapping
from eldenrando.model.hintmarks import GraceGroup, HintItem, Hintmarks, HintUpgrade

_GROUP_FIELDS = frozenset(
    {
        "Includes",
        "MainBonfire",
        "Boss",
        "Parent",
        "Bonfires",
        "DisplayName",
        "Comment",
        "BossFlag",
    }
)
_ITEM_FIELDS = frozenset(
    {"Name", "UnexploredCheck", "Comment", "Reqs", "DisplayName", "MultiName"}
)
_UPGRADE_FIELDS = frozenset({"Name", "Names", "Comment"})


def load_hintmarks(path: Path) -> Hintmarks:
    """Return the grace groups, key-item hints and upgrade groups of a hintmarks document."""
    document = load_mapping(path)
    return Hintmarks(
        debug_info=_string_list(document, "DebugInfo"),
        enable_flag=get_integer(document, "EnableFlag", "hintmarks"),
        groups=tuple(
            _parse_group(entry, f"Areas[{index}]")
            for index, entry in enumerate(require_sequence(document.get("Areas"), "Areas"))
        ),
        items=tuple(
            _parse_item(entry, f"Items[{index}]")
            for index, entry in enumerate(require_sequence(document.get("Items"), "Items"))
        ),
        upgrades=tuple(
            _parse_upgrade(entry, f"UpgradeItems[{index}]")
            for index, entry in enumerate(
                require_sequence(document.get("UpgradeItems"), "UpgradeItems")
            )
        ),
    )


def _string_list(document: dict[object, object], key: str) -> tuple[str, ...]:
    """Return a top-level list of strings."""
    return tuple(
        require_string(entry, f"{key}[{index}]")
        for index, entry in enumerate(require_sequence(document.get(key), key))
    )


def _parse_group(entry: object, where: str) -> GraceGroup:
    """Return one hint region."""
    mapping = require_mapping(entry, where)
    check_keys(mapping, _GROUP_FIELDS, where)
    return GraceGroup(
        includes=get_words(mapping, "Includes", where),
        main_bonfire=get_optional_string(mapping, "MainBonfire", where),
        boss=get_optional_scalar(mapping, "Boss", where),
        parent=get_optional_string(mapping, "Parent", where),
        bonfires=get_optional_string(mapping, "Bonfires", where),
        display_name=get_optional_string(mapping, "DisplayName", where),
        comment=get_optional_string(mapping, "Comment", where),
        boss_flag=get_optional_integer(mapping, "BossFlag", where),
    )


def _parse_item(entry: object, where: str) -> HintItem:
    """Return one key-item hint."""
    mapping = require_mapping(entry, where)
    check_keys(mapping, _ITEM_FIELDS, where)
    return HintItem(
        name=get_string(mapping, "Name", where),
        unexplored_check=get_optional_string(mapping, "UnexploredCheck", where),
        reqs=get_scalar_maps(mapping, "Reqs", where),
        comment=get_optional_string(mapping, "Comment", where),
        display_name=get_optional_string(mapping, "DisplayName", where),
        multi_name=get_optional_string(mapping, "MultiName", where),
    )


def _parse_upgrade(entry: object, where: str) -> HintUpgrade:
    """Return one group of upgrade items."""
    mapping = require_mapping(entry, where)
    check_keys(mapping, _UPGRADE_FIELDS, where)
    single = get_optional_string(mapping, "Name", where)
    plural = _strings(mapping.get("Names"), f"{where}.Names")
    return HintUpgrade(
        names=plural if plural else (() if single is None else (single,)),
        comment=get_optional_string(mapping, "Comment", where),
    )


def _strings(value: object, where: str) -> tuple[str, ...]:
    """Return an optional YAML list of strings."""
    if value is None:
        return ()
    return tuple(
        require_string(entry, f"{where}[{index}]")
        for index, entry in enumerate(require_sequence(value, where))
    )
