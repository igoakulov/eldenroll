"""Tests for the fifteen base-game JSON loaders.

Record counts are the ones recorded in `data.md` §7.3. When `raw/` is absent (a public
checkout) the data tests skip instead of failing.
"""

from __future__ import annotations

from pathlib import Path
from typing import cast

import pytest

from eldenrando.loaders.json_source import (
    JSON_FILES,
    load_all_documents,
    load_document,
    read_records,
)
from eldenrando.loaders.schema import LoaderError

JSON_DIR = Path(__file__).resolve().parents[2] / "raw" / "json-no-dlc"
needs_data = pytest.mark.skipif(not JSON_DIR.is_dir(), reason="raw source data not present")

EXPECTED_COUNTS: dict[str, int] = {
    "ammos": 53,
    "armors": 568,
    "ashes": 90,
    "bosses": 106,
    "classes": 14,
    "creatures": 115,
    "incantations": 98,
    "items": 462,
    "locations": 177,
    "npcs": 55,
    "shields": 69,
    "sorceries": 71,
    "spirits": 64,
    "talismans": 87,
    "weapons": 307,
}


@needs_data
def test_all_fifteen_documents_parse() -> None:
    documents = load_all_documents(JSON_DIR)

    assert set(documents) == set(EXPECTED_COUNTS) == set(JSON_FILES)
    assert sum(document.count for document in documents.values()) == 2336


@needs_data
@pytest.mark.parametrize(("name", "expected"), sorted(EXPECTED_COUNTS.items()))
def test_record_counts(name: str, expected: int) -> None:
    document = load_document(JSON_DIR, name)

    assert document.count == expected
    assert len(set(document.ids)) == expected


@needs_data
def test_every_record_has_a_string_name() -> None:
    for document in load_all_documents(JSON_DIR).values():
        assert all(isinstance(record["name"], str) for record in document.records), document.name


@needs_data
def test_known_record_shape_gaps() -> None:
    documents = load_all_documents(JSON_DIR)
    bosses = documents["bosses"].records
    items = documents["items"].records
    locations = documents["locations"].records

    assert sum(1 for record in bosses if "healthPoints" not in record) == 1
    assert sum(1 for record in items if "effect" not in record) == 3
    assert sum(1 for record in locations if "description" not in record) == 2
    assert sum(1 for record in locations if "Liurnia of the Lakes" in record) == 2


@needs_data
def test_weapon_and_shield_records_carry_requirements() -> None:
    documents = load_all_documents(JSON_DIR)

    for name in ("weapons", "shields"):
        attributes = [record["requiredAttributes"] for record in documents[name].records]
        assert all(isinstance(entry, list) and cast("list[object]", entry) for entry in attributes)


def test_missing_json_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="cannot read"):
        read_records(tmp_path / "absent.json")


def test_invalid_json_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "broken.json"
    source.write_text("[}", encoding="utf-8")

    with pytest.raises(LoaderError, match="invalid JSON"):
        read_records(source)


def test_top_level_object_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "object.json"
    source.write_text('{"id": "x"}', encoding="utf-8")

    with pytest.raises(LoaderError, match="expected a list, got dict"):
        read_records(source)


def test_non_mapping_record_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "list.json"
    source.write_text('["x"]', encoding="utf-8")

    with pytest.raises(LoaderError, match=r"record 0: expected a mapping, got str"):
        read_records(source)


def test_record_without_id_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "record.json"
    source.write_text('[{"name": "x"}]', encoding="utf-8")

    with pytest.raises(LoaderError, match=r"record 0\.id: expected a string, got NoneType"):
        read_records(source)


def test_duplicate_id_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "duplicate.json"
    source.write_text('[{"id": "a", "name": "x"}, {"id": "a", "name": "y"}]', encoding="utf-8")

    with pytest.raises(LoaderError, match=r"record 1: duplicate id 'a'"):
        read_records(source)


def test_missing_required_field_is_a_loader_error(tmp_path: Path) -> None:
    source = tmp_path / "field.json"
    source.write_text('[{"id": "a", "name": "x"}]', encoding="utf-8")

    with pytest.raises(LoaderError, match=r"record 0: missing field 'weight'"):
        read_records(source, required_fields=("weight",))


def test_unknown_document_name_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="unknown JSON document 'rings'"):
        load_document(tmp_path, "rings")
