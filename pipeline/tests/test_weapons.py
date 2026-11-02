"""Tests for the weapon and shield rows against the real sources (`data.md` §4.2, `prd.md` §6.3)."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from eldenrando.build.items import build_item_table
from eldenrando.build.weapons import build_weapons
from eldenrando.errors import BuildError
from eldenrando.loaders.added_items import load_added_items
from eldenrando.loaders.csv_source import CsvTable
from eldenrando.loaders.iteminfo import load_item_catalog
from eldenrando.loaders.json_source import load_document
from eldenrando.loaders.name_variants import load_name_variants
from eldenrando.loaders.schema import LoaderError
from eldenrando.loaders.weapons import load_weapon_categories
from eldenrando.model.item import Item
from eldenrando.model.item_catalog import CatalogGroup, ItemCatalog
from eldenrando.model.name_variant import NameVariant

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "overrides"
RAW = ROOT / "raw"
ITEMINFO = RAW / "pc_mod_data" / "iteminfo.txt"
WEAPON_SHEET = RAW / "csv" / "weapons_shields_categories.csv"
needs_files = pytest.mark.skipif(not ITEMINFO.is_file(), reason="raw data not present")

PRD_CLASSES = {
    "dagger",
    "straight_sword",
    "greatsword",
    "colossal_sword",
    "curved_sword",
    "curved_greatsword",
    "katana",
    "twinblade",
    "thrusting_sword",
    "heavy_thrusting_sword",
    "axe",
    "greataxe",
    "hammer",
    "great_hammer",
    "flail",
    "spear",
    "great_spear",
    "halberd",
    "reaper",
    "fist",
    "claw",
    "whip",
    "colossal_weapon",
    "light_greatsword",
    "great_katana",
    "backhand_blade",
    "beast_claw",
    "hand_to_hand",
    "throwing_blade",
    "light_bow",
    "bow",
    "greatbow",
    "crossbow",
    "ballista",
    "glintstone_staff",
    "sacred_seal",
    "small_shield",
    "medium_shield",
    "greatshield",
    "thrusting_shield",
    "torch",
    "perfume_bottle",
}
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
def weapons() -> tuple[Item, ...]:
    return build_weapons(
        load_item_catalog(ITEMINFO),
        load_name_variants(OVERRIDES / "name_variants.csv"),
        load_added_items(OVERRIDES / "items.csv"),
        load_weapon_categories(WEAPON_SHEET),
    )


@pytest.fixture(scope="module")
def by_name(weapons: tuple[Item, ...]) -> dict[str, Item]:
    return {row.name: row for row in weapons}


@needs_files
def test_rows_names_and_slugs_are_all_487(weapons: tuple[Item, ...]) -> None:
    assert len(weapons) == 487
    assert len({row.name for row in weapons}) == 487
    assert len({row.id for row in weapons}) == 487
    assert build_item_table(weapons) == weapons


@needs_files
def test_category_split_is_409_weapons_and_78_shields(weapons: tuple[Item, ...]) -> None:
    assert Counter(row.category for row in weapons) == {"weapon": 409, "shield": 78}


@needs_files
def test_every_shield_class_and_only_those_are_shields(weapons: tuple[Item, ...]) -> None:
    shield_classes = {"small_shield", "medium_shield", "greatshield"}

    assert all((row.category == "shield") == (row.subcategory in shield_classes) for row in weapons)


@needs_files
def test_classes_are_exactly_the_42_in_the_prd(weapons: tuple[Item, ...]) -> None:
    assert {row.subcategory for row in weapons} == PRD_CLASSES


@needs_files
def test_catalyst_and_odd_weapon_counts(weapons: tuple[Item, ...]) -> None:
    counts = Counter(row.subcategory for row in weapons)

    assert counts["glintstone_staff"] == 20
    assert counts["sacred_seal"] == 12
    assert counts["torch"] == 8
    assert counts["perfume_bottle"] == 5


@needs_files
def test_thrusting_shields_are_weapons(weapons: tuple[Item, ...]) -> None:
    rows = [row for row in weapons if row.subcategory == "thrusting_shield"]

    assert {row.name for row in rows} == {
        "Dueling Shield",
        "Carian Thrusting Shield",
        "Ritual Thrusting Shield",
    }
    assert {row.category for row in rows} == {"weapon"}


@needs_files
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


@needs_files
@pytest.mark.parametrize("name", ["Unarmed", "Sacred Butchering Knife"])
def test_name_is_absent(by_name: dict[str, Item], name: str) -> None:
    assert name not in by_name


@needs_files
@pytest.mark.parametrize("name", ["Serpent-Hunter", "Sword of Light", "Sword of Darkness"])
def test_added_weapons_are_present(by_name: dict[str, Item], name: str) -> None:
    assert by_name[name].category == "weapon"


@needs_files
@pytest.mark.parametrize("name", TARNISHED_TAGGED)
def test_weapons_the_mod_tags_tarnished_stay_in_the_pool(
    by_name: dict[str, Item], name: str
) -> None:
    assert name in by_name


@needs_files
@pytest.mark.parametrize(
    ("name", "item_id"),
    [("Great Épée", "great_epee"), ("Miséricorde", "misericorde")],
)
def test_accented_names_keep_their_spelling(
    by_name: dict[str, Item], name: str, item_id: str
) -> None:
    assert by_name[name].id == item_id


@needs_files
def test_every_json_weapon_maps_to_the_pool_or_is_not_in_the_game(
    by_name: dict[str, Item],
) -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")
    pool = {name.lower() for name in by_name}
    unmatched: set[str] = set()
    for document in ("weapons", "shields"):
        for record in load_document(RAW / "json-no-dlc", document).records:
            variant = variants.get(str(record["id"]))
            name = variant.canonical_name if variant else str(record["name"])
            if name.lower() not in pool:
                unmatched.add(name)

    assert unmatched == NOT_OBTAINABLE
    assert not NOT_OBTAINABLE & set(by_name)


@needs_files
def test_later_steps_own_the_remaining_fields(weapons: tuple[Item, ...]) -> None:
    for row in weapons:
        assert row.infusable is None
        assert row.str_bonus_2h is None
        assert row.image is None
        assert row.alias is None
        assert (row.req_str, row.req_dex, row.req_int, row.req_fth, row.req_arc) == (0, 0, 0, 0, 0)


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
        build_weapons(
            _catalog({1: "Dagger"}), {}, (), _sheet(("Axe", "Dagger"), ("Axe", "Stray"))
        )


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


def test_name_variants_file_holds_the_knife_and_the_gauntlets() -> None:
    variants = load_name_variants(OVERRIDES / "name_variants.csv")

    assert variants["15120700"].canonical_name == "Butchering Knife"
    assert variants["17f693ced0bl0i0oh402gmm7bjbdty"].canonical_name == "Redmane Knight Gauntlets"


def test_added_items_file_holds_the_three_weapons() -> None:
    assert load_added_items(OVERRIDES / "items.csv") == (
        "Serpent-Hunter",
        "Sword of Light",
        "Sword of Darkness",
    )


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ("1,Old,New,,owner", "empty reason"),
        ("1,Old,New,why,", "empty reviewer"),
        (",Old,New,why,owner", "empty source_id"),
    ],
)
def test_incomplete_name_variant_stops_the_load(tmp_path: Path, line: str, message: str) -> None:
    path = tmp_path / "name_variants.csv"
    path.write_text(f"source_id,source_name,canonical_name,reason,reviewer\n{line}\n")

    with pytest.raises(LoaderError, match=message):
        load_name_variants(path)


def test_repeated_name_variant_id_stops_the_load(tmp_path: Path) -> None:
    path = tmp_path / "name_variants.csv"
    path.write_text(
        "source_id,source_name,canonical_name,reason,reviewer\n"
        "1,Old,New,why,owner\n"
        "1,Old,Newer,why,owner\n"
    )

    with pytest.raises(LoaderError, match="duplicate source_id '1'"):
        load_name_variants(path)


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("", "no rows"),
        ("Sword,,owner\n", "empty reason"),
        ("Sword,why,owner\nSword,why,owner\n", "duplicate name 'Sword'"),
    ],
)
def test_bad_added_items_file_stops_the_load(tmp_path: Path, body: str, message: str) -> None:
    path = tmp_path / "items.csv"
    path.write_text(f"name,reason,reviewer\n{body}")

    with pytest.raises(LoaderError, match=message):
        load_added_items(path)
