"""Tests for the Fextralife links on the item, armor set, boss and alias tables
(`data/sources/README.md#Wiki lookups`)."""

from __future__ import annotations

import csv
from pathlib import Path
from urllib.parse import unquote

import pytest

from eldenroll.build.wiki import WIKI_BASE, wiki_page, wiki_url, with_wiki_urls
from eldenroll.errors import BuildError
from eldenroll.validate.gate_data import GateData

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides" / "wiki_urls.csv"


def _is_none(row: object) -> bool:
    return "none" in (getattr(row, "category", None), getattr(row, "alias", None))


def test_every_rollable_row_and_alias_links_to_a_fextralife_page(gate_data: GateData) -> None:
    rollable_items = [row for row in gate_data.database.items if row.odds > 0 and not _is_none(row)]
    rollable = [
        *rollable_items,
        *(row for row in gate_data.database.armor_sets if row.odds > 0),
        *(row for row in gate_data.database.bosses if row.odds > 0),
        *(row for row in gate_data.database.aliases if row.id != "none"),
    ]
    assert rollable_items and gate_data.database.armor_sets and gate_data.database.bosses
    for row in rollable:
        assert row.url is not None and row.url.startswith(WIKI_BASE), row.id


def test_a_row_that_never_rolls_or_is_none_has_no_link(gate_data: GateData) -> None:
    unlinked = [
        row
        for row in (
            *gate_data.database.items,
            *gate_data.database.armor_sets,
            *gate_data.database.bosses,
        )
        if row.odds <= 0 or _is_none(row)
    ]
    assert any(getattr(row, "alias", None) == "none" for row in unlinked)
    assert all(row.url is None for row in unlinked)
    assert next(row for row in gate_data.database.aliases if row.id == "none").url is None


def test_an_accented_name_gives_plain_letters(gate_data: GateData) -> None:
    accented = [row for row in gate_data.database.items if row.odds > 0 and not row.name.isascii()]
    assert accented
    for row in accented:
        assert row.url is not None
        assert unquote(row.url).isascii(), row.name


def test_wiki_url_drops_accents_and_encodes_the_rest() -> None:
    assert wiki_url("Épée") == WIKI_BASE + "Epee"
    assert wiki_url("A & B+C") == WIKI_BASE + "A+%26+B%2BC"
    assert wiki_url("Thops's (Barrier), x: y") == WIKI_BASE + "Thops's+(Barrier),+x:+y"


def test_an_ash_page_takes_the_ash_of_war_prefix_once() -> None:
    assert wiki_page("Barrier", "ash") == "Ash of War: Barrier"
    assert wiki_page("Ash of War: Barrier", "ash") == "Ash of War: Barrier"
    assert wiki_page("Barrier", "weapon") == "Barrier"


def test_every_ash_links_to_its_prefixed_page(gate_data: GateData) -> None:
    ashes = [row for row in gate_data.database.items if row.category == "ash" and row.odds > 0]
    assert ashes
    for row in ashes:
        assert row.url == wiki_url(f"Ash of War: {row.name}"), row.name


def test_a_seeded_override_wins_over_the_built_url(gate_data: GateData) -> None:
    with OVERRIDES.open(encoding="utf-8", newline="") as handle:
        seeded = [row for row in csv.DictReader(handle) if row["url"]]
    assert seeded
    tables = {
        "item": gate_data.database.items,
        "armor_set": gate_data.database.armor_sets,
        "boss_instance": gate_data.database.bosses,
        "alias": gate_data.database.aliases,
    }
    for row in seeded:
        built = next(one for one in tables[row["kind"]] if one.id == row["id"])
        assert built.url == row["url"], row["id"]
        assert built.url != wiki_url(getattr(built, "name", "")), row["id"]


def test_an_empty_override_means_no_link(gate_data: GateData) -> None:
    rollable = next(
        row for row in gate_data.database.items if row.odds > 0 and row.category != "none"
    )
    cleared = with_wiki_urls(gate_data.database, {("item", rollable.id): ""})
    assert next(row for row in cleared.items if row.id == rollable.id).url is None


def test_an_override_names_no_unknown_row(gate_data: GateData) -> None:
    with pytest.raises(BuildError, match="wiki_urls names no row: item no_such_item"):
        with_wiki_urls(gate_data.database, {("item", "no_such_item"): ""})
    with pytest.raises(BuildError, match="names no row"):
        with_wiki_urls(gate_data.database, {("weapon", "beast_claw"): ""})
