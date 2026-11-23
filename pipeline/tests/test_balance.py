"""`data/balance.md` explains every modifier row and every odds value other than 1, so it must name
exactly the ids the data holds."""

from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
BALANCE = (ROOT / "data" / "balance.md").read_text(encoding="utf-8")
ODDS_FILES = {
    "class": ("character_classes.csv", "id"),
    "rule": ("combat_rules.csv", "id"),
    "item": ("item_odds.csv", "item"),
    "boss": ("boss_odds.csv", "boss"),
    "armor_set": ("armor_set_odds.csv", "armor_set"),
}


def _ids(text: str) -> set[str]:
    return set(re.findall(r"`([a-z0-9_]+)`", text))


def _rows(name: str) -> list[dict[str, str]]:
    with (OVERRIDES / name).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_every_modifier_row_has_its_rule() -> None:
    listed = _ids("\n".join(re.findall(r"^Rows: (.*)$", BALANCE, flags=re.M)))
    assert listed == {row["id"] for row in _rows("modifiers.csv")}


def test_every_odds_value_other_than_1_has_its_reason() -> None:
    table = re.search(r"^## Base odds\n(.*?)^## ", BALANCE, flags=re.M | re.S)
    assert table is not None
    # A row's odds are one value, or a range, low and high joined by an en dash, for a group whose
    # values live in the data file
    listed: dict[tuple[str, str], tuple[float, float]] = {}
    for line in table[1].splitlines():
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) == 4 and cells[0] in ODDS_FILES:
            low, _, high = cells[2].partition("\N{EN DASH}")
            bounds = (float(low), float(high or low))
            listed |= {(cells[0], key): bounds for key in _ids(cells[1])}
    data = {
        (kind, row[key]): float(row["odds"])
        for kind, (name, key) in ODDS_FILES.items()
        for row in _rows(name)
        if float(row["odds"]) != 1
    }
    assert set(listed) == set(data)
    assert [key for key, odds in data.items() if not listed[key][0] <= odds <= listed[key][1]] == []
