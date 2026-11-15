"""Tests for the weapon and shield rows against the real sources
(`data/README.md#Weapons and shields`)."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.build.weapons import build_weapons
from eldenroll.errors import BuildError
from eldenroll.loaders.added_items import load_added_items
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.loaders.json_source import load_document
from eldenroll.loaders.name_variants import load_name_variants
from eldenroll.loaders.schema import LoaderError
from eldenroll.loaders.weapons import load_weapon_categories
from eldenroll.model.item import Item
from eldenroll.model.item_catalog import CatalogGroup, ItemCatalog
from eldenroll.model.name_variant import NameVariant
from eldenroll.paths import ITEMS_DIR, WEAPON_SHIELD_CLASSES
from eldenroll.validate.gaps import GapSources

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"

NOT_OBTAINABLE = {"Winged Spear"}
TARNISHED_TAGGED = [
    "Golden Order Flail",
    "Hefty Scimitar",
    "Idus Sword",
    "Leontiel's Greatsword",
    "Reed Great Katana",
    "Reverse-Bladed Sword",
    "Ritual Thrusting Shield",
    "Silver Grooved Shield",
]


def _catalog(names: dict[int, str]) -> ItemCatalog:
    group = CatalogGroup(
        name="weapons",
        items={"weapon": tuple(names)},
        item_count=len(names),
        location_count=0,
        unique_count=0,
    )
    return ItemCatalog(
        names={"weapon": names},
        counts={},
        unique_counts={},
        groups={"weapons": group},
        locations=(),
    )


def _sheet(*rows: tuple[str, str]) -> CsvTable:
    return CsvTable(
        path=Path("sheet.csv"),
        header_row=0,
        header=("Weapon Class", "Weapon"),
        rows=rows,
    )


@pytest.fixture(scope="module")
def weapons(sources: GapSources) -> tuple[Item, ...]:
    return build_weapons(
        sources.catalog,
        load_name_variants(OVERRIDES / "name_variants.csv"),
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHIELD_CLASSES),
    )


@pytest.fixture(scope="module")
def by_name(weapons: tuple[Item, ...]) -> dict[str, Item]:
    return {row.name: row for row in weapons}


def test_every_shield_class_and_only_those_are_shields(weapons: tuple[Item, ...]) -> None:
    shield_classes = {"small_shield", "medium_shield", "greatshield"}

    assert all((row.category == "shield") == (row.subcategory in shield_classes) for row in weapons)


def test_thrusting_shields_are_weapons(weapons: tuple[Item, ...]) -> None:
    rows = [row for row in weapons if row.subcategory == "thrusting_shield"]

    assert {row.name for row in rows} == {
        "Dueling Shield",
        "Carian Thrusting Shield",
        "Ritual Thrusting Shield",
    }
    assert {row.category for row in rows} == {"weapon"}


@pytest.mark.parametrize(
    ("name", "subcategory"),
    [
        ("Smithscript Shield", "small_shield"),
        ("Smithscript Dagger", "throwing_blade"),
        ("Butchering Knife", "greataxe"),
        ("Gargoyle's Black Axe", "greataxe"),
        ("Vulgar Militia Shotel", "halberd"),
        ("Beastman's Jar-Shield", "medium_shield"),
    ],
)
def test_class_comes_from_the_weapon_sheet(
    by_name: dict[str, Item], name: str, subcategory: str
) -> None:
    assert by_name[name].subcategory == subcategory


@pytest.mark.parametrize("name", ["Unarmed", "Sacred Butchering Knife"])
def test_name_is_absent(by_name: dict[str, Item], name: str) -> None:
    assert name not in by_name


@pytest.mark.parametrize("name", ["Serpent-Hunter", "Sword of Light", "Sword of Darkness"])
def test_added_weapons_are_present(by_name: dict[str, Item], name: str) -> None:
    assert by_name[name].category == "weapon"


@pytest.mark.parametrize("name", TARNISHED_TAGGED)
def test_weapons_the_mod_tags_tarnished_stay_in_the_pool(
    by_name: dict[str, Item], name: str
) -> None:
    assert name in by_name


@pytest.mark.parametrize(
    ("name", "item_id"),
    [("Great Épée", "great_epee"), ("Miséricorde", "misericorde")],
)
def test_accented_names_keep_their_spelling(
    by_name: dict[str, Item], name: str, item_id: str
) -> None:
    assert by_name[name].id == item_id


def test_every_json_weapon_maps_to_the_pool_or_is_not_in_the_game(
    by_name: dict[str, Item],
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pool = {name.lower() for name in by_name}
    unmatched: set[str] = set()
    for document in ("weapons", "shields"):
        for record in load_document(ITEMS_DIR, document).records:
            variant = variants.get(str(record["id"]))
            name = variant.canonical_name if variant else str(record["name"])
            if name.lower() not in pool:
                unmatched.add(name)

    assert unmatched == NOT_OBTAINABLE
    assert not NOT_OBTAINABLE & set(by_name)


def test_group_id_outside_the_names_stops_the_build() -> None:
    catalog = _catalog({1: "Dagger"})
    catalog.names["weapon"].pop(1)

    with pytest.raises(BuildError, match="id 1 has no name"):
        build_weapons(catalog, {}, (), _sheet())


def test_variant_replaces_the_name_of_its_id() -> None:
    variant = NameVariant(source_id="1", source_name="Old", canonical_name="New")

    rows = build_weapons(_catalog({1: "Old"}), {"1": variant}, (), _sheet(("Axe", "New")))

    assert [row.name for row in rows] == ["New"]


def test_variant_for_another_record_stops_the_build() -> None:
    variant = NameVariant(source_id="1", source_name="Other", canonical_name="New")

    with pytest.raises(BuildError, match="expects 'Other', source says 'Old'"):
        build_weapons(_catalog({1: "Old"}), {"1": variant}, (), _sheet(("Axe", "New")))


def test_variant_for_an_id_outside_the_group_is_left_alone() -> None:
    variant = NameVariant(source_id="hash", source_name="Helm", canonical_name="Gauntlets")

    rows = build_weapons(_catalog({1: "Dagger"}), {"hash": variant}, (), _sheet(("Axe", "Dagger")))

    assert [row.name for row in rows] == ["Dagger"]


def test_weapon_without_a_class_stops_the_build() -> None:
    with pytest.raises(BuildError, match="no class: Dagger"):
        build_weapons(_catalog({1: "Dagger"}), {}, (), _sheet())


def test_added_weapon_without_a_class_stops_the_build() -> None:
    with pytest.raises(BuildError, match="no class: Added"):
        build_weapons(_catalog({1: "Dagger"}), {}, ("Added",), _sheet(("Axe", "Dagger")))


def test_sheet_name_that_is_no_weapon_stops_the_build() -> None:
    with pytest.raises(BuildError, match="unknown weapon"):
        build_weapons(_catalog({1: "Dagger"}), {}, (), _sheet(("Axe", "Dagger"), ("Axe", "Stray")))


def test_sheet_repeating_a_name_stops_the_build() -> None:
    with pytest.raises(BuildError, match="repeats 'Dagger'"):
        build_weapons(
            _catalog({1: "Dagger"}), {}, (), _sheet(("Axe", "Dagger"), ("Hammer", "Dagger"))
        )


def test_sheet_name_with_a_blank_class_stops_the_build() -> None:
    with pytest.raises(BuildError, match="gives 'Dagger' no class"):
        build_weapons(_catalog({1: "Dagger"}), {}, (), _sheet(("", "Dagger")))


def test_sheet_blank_rows_and_unarmed_are_skipped() -> None:
    rows = build_weapons(
        _catalog({1: "Dagger"}),
        {},
        (),
        _sheet(("", ""), ("Fist", "Unarmed"), ("Small Shield", "Dagger")),
    )

    assert [(row.name, row.category, row.subcategory) for row in rows] == [
        ("Dagger", "shield", "small_shield")
    ]


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("1,Old,New,false,", "empty reason"),
        ("1,Old,New,,why", "empty by_name"),
        ("1,Old,New,maybe,why", "by_name is 'maybe'"),
        (",Old,New,false,why", "empty source_id"),
    ],
)
def test_incomplete_name_variant_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "name_variants.csv"
    path.write_text(f"source_id,source_name,canonical_name,by_name,reason\n{line}\n")

    with pytest.raises(LoaderError, match=message):
        load_name_variants(path)


def test_repeated_name_variant_id_stops_the_load(tmp_path: Path) -> None:
    path = tmp_path / "name_variants.csv"
    path.write_text(
        "source_id,source_name,canonical_name,by_name,reason\n"
        "1,Old,New,false,why\n"
        "1,Old,Newer,false,why\n"
    )

    with pytest.raises(LoaderError, match="duplicate source_id '1'"):
        load_name_variants(path)


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("", "no rows"),
        ("Sword,\n", "empty reason"),
        ("Sword,why\nSword,why\n", "duplicate name 'Sword'"),
    ],
)
def test_bad_added_items_file_stops_the_load(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "items.csv"
    path.write_text(f"name,reason\n{body}")

    with pytest.raises(LoaderError, match=message):
        load_added_items(path)
