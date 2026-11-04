"""Each file is a JSON array whose records carry a unique `id`. Every record also has a `name`, but
names repeat, so the id is the identity and the name a label. Presence is validated; types are
not, because the sources mix numbers, numeric strings and `null`, and each consumer knows its own
shape.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from eldenrando.loaders.schema import LoaderError, require_mapping

# Logical name -> the only fields the build reads beyond `id` and `name`. An empty tuple
# means the file is parsed for its record count and identity, nothing else.
JSON_FILES: dict[str, tuple[str, ...]] = {
    "armors": ("category",),
    "ashes": (),
    "incantations": ("requires",),
    "location_names": (),
    "shields": ("requiredAttributes",),
    "sorceries": ("requires",),
    "talismans": (),
    "weapons": ("requiredAttributes",),
}


@dataclass(frozen=True, slots=True)
class JsonDocument:
    name: str
    path: Path
    records: tuple[dict[str, object], ...]

    @property
    def count(self) -> int:
        return len(self.records)

    @property
    def ids(self) -> tuple[str, ...]:
        return tuple(cast("str", record["id"]) for record in self.records)


def read_records(
    path: Path,
    *,
    required_fields: Sequence[str] = (),
) -> tuple[dict[str, object], ...]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise LoaderError(f"{path}: cannot read ({exc})") from exc
    except UnicodeDecodeError as exc:
        raise LoaderError(f"{path}: not UTF-8 ({exc})") from exc
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LoaderError(f"{path}: invalid JSON ({exc})") from exc
    if not isinstance(document, list):
        raise LoaderError(f"{path}: expected a list, got {type(document).__name__}")
    entries = cast("list[object]", document)
    records: list[dict[str, object]] = []
    seen: set[str] = set()
    for index, entry in enumerate(entries):
        where = f"{path}: record {index}"
        record = _record(entry, where)
        record_id = _string_field(record, "id", where)
        _string_field(record, "name", where)
        if record_id in seen:
            raise LoaderError(f"{where}: duplicate id {record_id!r}")
        seen.add(record_id)
        for field in required_fields:
            if field not in record:
                raise LoaderError(f"{where}: missing field {field!r}")
        records.append(record)
    return tuple(records)


def _string_field(record: dict[str, object], key: str, where: str) -> str:
    value = record.get(key)
    if not isinstance(value, str):
        raise LoaderError(f"{where}.{key}: expected a string, got {type(value).__name__}")
    return value


def _record(entry: object, where: str) -> dict[str, object]:
    mapping = require_mapping(entry, where)
    out: dict[str, object] = {}
    for key, value in mapping.items():
        if not isinstance(key, str):
            raise LoaderError(f"{where}: field name {key!r} is not a string")
        out[key] = value
    return out


def load_document(directory: Path, name: str) -> JsonDocument:
    fields = JSON_FILES.get(name)
    if fields is None:
        raise LoaderError(f"{directory}: unknown JSON document {name!r}")
    path = directory / f"{name}.json"
    return JsonDocument(name=name, path=path, records=read_records(path, required_fields=fields))

