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
    """Return a printable location, using a placeholder for the document root."""
    return path or "<root>"


def require_mapping(value: object, path: str) -> Mapping[object, object]:
    """Return `value` as a mapping, or raise if it is not one."""
    if not isinstance(value, Mapping):
        raise LoaderError(f"{_describe(path)}: expected a mapping, got {type(value).__name__}")
    return dict(cast("Mapping[object, object]", value))


def require_sequence(value: object, path: str) -> list[object]:
    """Return `value` as a list, or raise if it is not one."""
    if not isinstance(value, list):
        raise LoaderError(f"{_describe(path)}: expected a list, got {type(value).__name__}")
    return list(cast("list[object]", value))


def require_string(value: object, path: str) -> str:
    """Return `value` as a string, or raise if it is not one."""
    if not isinstance(value, str):
        raise LoaderError(f"{_describe(path)}: expected a string, got {type(value).__name__}")
    return value


def require_integer(value: object, path: str) -> int:
    """Return `value` as an integer, or raise if it is not one."""
    if not isinstance(value, int) or isinstance(value, bool):
        raise LoaderError(f"{_describe(path)}: expected an integer, got {type(value).__name__}")
    return value


def check_keys(mapping: Mapping[object, object], allowed: Collection[str], path: str) -> None:
    """Raise if `mapping` holds a key outside `allowed`."""
    permitted = set(allowed)
    unknown = sorted(str(key) for key in mapping if key not in permitted)
    if unknown:
        raise LoaderError(f"{_describe(path)}: unexpected field(s) {', '.join(unknown)}")


def _key(mapping: Mapping[object, object], key: str, path: str) -> object | None:
    """Return the raw value for `key`, or None when absent."""
    return mapping.get(key)


def get_string(mapping: Mapping[object, object], key: str, path: str) -> str:
    """Return a required string field."""
    return require_string(_key(mapping, key, path), f"{path}.{key}")


def get_optional_string(mapping: Mapping[object, object], key: str, path: str) -> str | None:
    """Return an optional string field, or None when absent."""
    value = _key(mapping, key, path)
    return None if value is None else require_string(value, f"{path}.{key}")


def get_integer(mapping: Mapping[object, object], key: str, path: str) -> int:
    """Return a required integer field."""
    return require_integer(_key(mapping, key, path), f"{path}.{key}")


def get_optional_integer(mapping: Mapping[object, object], key: str, path: str) -> int | None:
    """Return an optional integer field, or None when absent."""
    value = _key(mapping, key, path)
    return None if value is None else require_integer(value, f"{path}.{key}")


def get_optional_scalar(
    mapping: Mapping[object, object], key: str, path: str
) -> int | str | None:
    """Return an optional field that is either an integer id or a name string."""
    value = _key(mapping, key, path)
    where = f"{path}.{key}"
    if value is None:
        return None
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value
    raise LoaderError(f"{where}: expected an integer or a string, got {type(value).__name__}")


def get_scalar_maps(
    mapping: Mapping[object, object], key: str, path: str
) -> tuple[dict[str, str | int], ...]:
    """Return an optional list of flat mappings with string keys and scalar values."""
    value = _key(mapping, key, path)
    if value is None:
        return ()
    out: list[dict[str, str | int]] = []
    for index, entry in enumerate(require_sequence(value, f"{path}.{key}")):
        where = f"{path}.{key}[{index}]"
        row = require_mapping(entry, where)
        parsed: dict[str, str | int] = {}
        for entry_key, entry_value in row.items():
            name = require_string(entry_key, f"{where} key")
            scalar = get_optional_scalar({name: entry_value}, name, where)
            if scalar is None:
                raise LoaderError(f"{where}.{name}: expected a value")
            parsed[name] = scalar
        out.append(parsed)
    return tuple(out)


def split_words(value: str | None) -> tuple[str, ...]:
    """Split a space-separated source field into words; `''` and None become empty."""
    return () if value is None else tuple(value.split())


def get_words(mapping: Mapping[object, object], key: str, path: str) -> tuple[str, ...]:
    """Return a space-separated field as a tuple, empty when absent."""
    return split_words(get_optional_string(mapping, key, path))


def get_string_list(mapping: Mapping[object, object], key: str, path: str) -> tuple[str, ...]:
    """Return a YAML list of strings as a tuple, empty when absent."""
    value = _key(mapping, key, path)
    if value is None:
        return ()
    items = require_sequence(value, f"{path}.{key}")
    return tuple(require_string(item, f"{path}.{key}[{index}]") for index, item in enumerate(items))


def get_int_map(mapping: Mapping[object, object], key: str, path: str) -> dict[int, int]:
    """Return a mapping of integer ids to integers."""
    value = require_mapping(_key(mapping, key, path), f"{path}.{key}")
    return {
        _require_int_key(entry_key, f"{path}.{key}"): require_integer(
            entry, f"{path}.{key}[{entry_key}]"
        )
        for entry_key, entry in value.items()
    }


def get_str_int_map(mapping: Mapping[object, object], key: str, path: str) -> dict[str, int]:
    """Return a mapping of string keys to integers."""
    value = require_mapping(_key(mapping, key, path), f"{path}.{key}")
    out: dict[str, int] = {}
    for entry_key, entry in value.items():
        name = require_string(entry_key, f"{path}.{key} key")
        out[name] = require_integer(entry, f"{path}.{key}.{name}")
    return out


def get_str_int_map_optional(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[str, int]:
    """Return a string-keyed integer mapping, empty when the field is absent."""
    if _key(mapping, key, path) is None:
        return {}
    return get_str_int_map(mapping, key, path)


def get_optional_int_map(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[int, int]:
    """Return an integer-keyed mapping, empty when the field is absent."""
    if _key(mapping, key, path) is None:
        return {}
    return get_int_map(mapping, key, path)


def _require_int_key(value: object, path: str) -> int:
    """Return a mapping key as an integer id."""
    return require_integer(value, f"{path} key")


def get_id_name_maps(
    mapping: Mapping[object, object], key: str, path: str
) -> dict[str, dict[int, str]]:
    """Return a category -> {id: name} mapping."""
    categories = require_mapping(_key(mapping, key, path), f"{path}.{key}")
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
    """Return a category -> {id: count} mapping."""
    categories = require_mapping(_key(mapping, key, path), f"{path}.{key}")
    out: dict[str, dict[int, int]] = {}
    for category, entries in categories.items():
        name = require_string(category, f"{path}.{key} key")
        out[name] = get_int_map({key: entries}, key, f"{path}.{key}.{name}")
    return out
