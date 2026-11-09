"""Tests for the eight base-game JSON loaders.

Record counts are the ones recorded in `data.md` §7.3.
"""

from __future__ import annotations

from pathlib import Path
from typing import cast

import pytest

from eldenroll.loaders.json_source import (
    JSON_FILES,
    JsonDocument,
    load_document,
    read_records,
)
from eldenroll.loaders.schema import LoaderError
from eldenroll.paths import ARMOR_DIR, ITEMS_DIR, LOCATIONS_DIR

REPEATED_NAMES: dict[str, int] = {"armors": 2, "location_names": 3, "weapons": 1}

EXPECTED_COUNTS: dict[str, int] = {
    "armors": 568,
    "ashes": 90,
    "incantations": 98,
    "location_names": 177,
    "shields": 69,
    "sorceries": 71,
    "talismans": 87,
    "weapons": 307,
}
DIRECTORIES: dict[str, Path] = {"armors": ARMOR_DIR, "location_names": LOCATIONS_DIR}


def _load(name: str) -> JsonDocument:
    return load_document(DIRECTORIES.get(name, ITEMS_DIR), name)


def test_all_eight_documents_parse() -> None:
    documents = [_load(name) for name in JSON_FILES]

    assert set(EXPECTED_COUNTS) == set(JSON_FILES)
    assert sum(document.count for document in documents) == sum(EXPECTED_COUNTS.values())


@pytest.mark.parametrize(("name", "expected"), sorted(EXPECTED_COUNTS.items()))
def test_record_counts(name: str, expected: int) -> None:
    document = _load(name)

    assert document.count == expected
    assert len(set(document.ids)) == expected


def test_every_record_has_a_string_name() -> None:
    for name in JSON_FILES:
        document = _load(name)
        assert all(isinstance(record["name"], str) for record in document.records), document.name


def test_names_repeat_across_records() -> None:
    for name, expected in REPEATED_NAMES.items():
        names = [cast("str", record["name"]) for record in _load(name).records]
        assert len(names) - len(set(names)) == expected, name


def test_duplicate_armor_name_carries_two_categories() -> None:
    armors = _load("armors").records
    redmane = [record for record in armors if record["name"] == "Redmane Knight Helm"]

    assert len(redmane) == 2
    assert {record["category"] for record in redmane} == {"Gauntlets", "Helm"}


def test_weapon_and_shield_records_carry_requirements() -> None:
    for name in ("weapons", "shields"):
        attributes = [record["requiredAttributes"] for record in _load(name).records]
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

    with pytest.raises(LoaderError, match=r"record 0: missing field 'category'"):
        read_records(source, required_fields=("category",))


def test_unknown_document_name_is_a_loader_error(tmp_path: Path) -> None:
    with pytest.raises(LoaderError, match="unknown JSON document 'rings'"):
        load_document(tmp_path, "rings")
