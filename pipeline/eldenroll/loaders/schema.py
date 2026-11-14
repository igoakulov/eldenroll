"""Strict accessors for values parsed out of a YAML document.

Loaders never index a document directly: every read goes through one of these helpers so
that a missing field, a wrong type or an unexpected key fails with the document path
instead of surfacing later as a silently wrong row.
"""

from __future__ import annotations

from collections.abc import Collection, Mapping
from typing import cast


class LoaderError(Exception):
    """Raised when a source document does not match the expected schema."""


def _describe(path: str) -> str:
    return path or "<root>"


def require_mapping(value: object, path: str) -> Mapping[object, object]:
    if not isinstance(value, Mapping):
        raise LoaderError(f"{_describe(path)}: expected a mapping, got {type(value).__name__}")
    return dict(cast("Mapping[object, object]", value))


def require_sequence(value: object, path: str) -> list[object]:
    if not isinstance(value, list):
        raise LoaderError(f"{_describe(path)}: expected a list, got {type(value).__name__}")
    return list(cast("list[object]", value))


def require_string(value: object, path: str) -> str:
    if not isinstance(value, str):
        raise LoaderError(f"{_describe(path)}: expected a string, got {type(value).__name__}")
    return value


def require_integer(value: object, path: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise LoaderError(f"{_describe(path)}: expected an integer, got {type(value).__name__}")
    return value


def check_keys(mapping: Mapping[object, object], allowed: Collection[str], path: str) -> None:
    permitted = set(allowed)
    unknown = sorted(str(key) for key in mapping if key not in permitted)
    if unknown:
        raise LoaderError(f"{_describe(path)}: unexpected field(s) {', '.join(unknown)}")


def get_string(mapping: Mapping[object, object], key: str, path: str) -> str:
    return require_string(mapping.get(key), f"{path}.{key}")


def get_optional_string(mapping: Mapping[object, object], key: str, path: str) -> str | None:
    value = mapping.get(key)
    return None if value is None else require_string(value, f"{path}.{key}")


def get_integer(mapping: Mapping[object, object], key: str, path: str) -> int:
    return require_integer(mapping.get(key), f"{path}.{key}")


def get_optional_integer(mapping: Mapping[object, object], key: str, path: str) -> int | None:
    value = mapping.get(key)
    return None if value is None else require_integer(value, f"{path}.{key}")


def split_words(value: str | None) -> tuple[str, ...]:
    """Split a space-separated source field into words; `''` and None become empty."""
    return () if value is None else tuple(value.split())


def get_words(mapping: Mapping[object, object], key: str, path: str) -> tuple[str, ...]:
    """Return a space-separated field as a tuple, empty when absent."""
    return split_words(get_optional_string(mapping, key, path))


def get_string_list(mapping: Mapping[object, object], key: str, path: str) -> tuple[str, ...]:
    """Return a YAML list of strings as a tuple, empty when absent."""
    value = mapping.get(key)
    if value is None:
        return ()
    items = require_sequence(value, f"{path}.{key}")
    return tuple(require_string(item, f"{path}.{key}[{index}]") for index, item in enumerate(items))


def get_int_map(mapping: Mapping[object, object], key: str, path: str) -> dict[int, int]:
    value = require_mapping(mapping.get(key), f"{path}.{key}")
    return {
        _require_int_key(entry_key, f"{path}.{key}"): require_integer(
            entry, f"{path}.{key}[{entry_key}]"
        )
        for entry_key, entry in value.items()
    }


def get_str_int_map(mapping: Mapping[object, object], key: str, path: str) -> dict[str, int]:
    value = require_mapping(mapping.get(key), f"{path}.{key}")
    out: dict[str, int] = {}
    for entry_key, entry in value.items():
        name = require_string(entry_key, f"{path}.{key} key")
        out[name] = require_integer(entry, f"{path}.{key}.{name}")
    return out


def get_str_int_map_optional(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[str, int]:
    """Return a string-keyed integer mapping, empty when the field is absent."""
    if mapping.get(key) is None:
        return {}
    return get_str_int_map(mapping, key, path)


def _require_int_key(value: object, path: str) -> int:
    return require_integer(value, f"{path} key")


def get_id_name_maps(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[str, dict[int, str]]:
    categories = require_mapping(mapping.get(key), f"{path}.{key}")
    out: dict[str, dict[int, str]] = {}
    for category, entries in categories.items():
        name = require_string(category, f"{path}.{key} key")
        id_map = require_mapping(entries, f"{path}.{key}.{name}")
        out[name] = {
            _require_int_key(entry_key, f"{path}.{key}.{name}"): require_string(
                entry, f"{path}.{key}.{name}[{entry_key}]"
            )
            for entry_key, entry in id_map.items()
        }
    return out


def get_category_int_maps(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[str, dict[int, int]]:
    categories = require_mapping(mapping.get(key), f"{path}.{key}")
    out: dict[str, dict[int, int]] = {}
    for category, entries in categories.items():
        name = require_string(category, f"{path}.{key} key")
        out[name] = get_int_map({key: entries}, key, f"{path}.{key}.{name}")
    return out
