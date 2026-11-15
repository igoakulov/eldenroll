"""Tests for the combat rule table against `web/src/engine/README.md#Combat rules`."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.loaders.combat_rules import load_combat_rules
from eldenroll.loaders.schema import LoaderError


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("r1_only,,1\n", "empty name"),
        ("r1,R1 only,1\n", "is not the slug"),
        ("r1_only,R1 only,-1\n", "has odds"),
        ("r1_only,R1 only,1\nr1_only,R1 only,1\n", "duplicate rule id"),
    ],
)
def test_bad_rows_fail_to_load(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "combat_rules.csv"
    path.write_text(f"id,name,odds\n{body}", encoding="utf-8")
    with pytest.raises(LoaderError, match=message):
        load_combat_rules(path)
