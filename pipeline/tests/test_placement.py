"""Tests for `item_location` rows against the real sources
(`data/README.md#Placement`, `web/src/engine/README.md#Eligibility`)."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from eldenroll.build.items import new_item
from eldenroll.build.placement import (
    BOSS_SHOP_TAGS,
    BOSS_SLOT_TAGS,
    Placement,
    PlacementSources,
    build_placements,
    item_locations,
)
from eldenroll.errors import BuildError
from eldenroll.loaders.boss_links import load_slot_links
from eldenroll.loaders.csv_source import CsvTable
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.boss_instance import BossInstance
from eldenroll.model.item import Item
from eldenroll.model.item_location import ItemLocation
from eldenroll.model.item_slot import ItemSlot
from eldenroll.model.region import ASHEN_CAPITAL, ROYAL_CAPITAL, SHUNNING_GROUNDS
from eldenroll.normalize.placement_names import PlacementNames, placement_names
from eldenroll.validate.gaps import GapSources
from eldenroll.validate.placement import (
    PlacementData,
    eligible_items,
    eligible_sets,
    needs_location,
    row_counts,
    selected_locations,
)

ENSIS = "Gravesite Plain - East Castle Ensis"
RAMPARTSIDE = "Altus Plateau - Rampartside Path, Altus Tunnel Entrance"
MOONFOLK = "Moonlight Altar - Moonfolk Ruins"


def _item(placement_data: PlacementData, name: str, category: str | None = None) -> Item:
    return next(
        item
        for item in placement_data.table
        if item.name == name and category in (None, item.category)
    )


def _places(placement_data: PlacementData, name: str, category: str | None = None) -> set[str]:
    """Return an item's rows, a location as its id and a boss as `name @ label`."""
    item_id = _item(placement_data, name, category).id
    bosses = {boss.id: boss for boss in placement_data.bosses}
    return {
        row.location_id
        or f"{bosses[str(row.boss_instance_id)].name} @ "
        f"{bosses[str(row.boss_instance_id)].location_label}"
        for row in item_locations(placement_data.placements)
        if row.item_id == item_id
    }


def _bosses_of(placement_data: PlacementData, name: str, category: str | None = None) -> set[str]:
    """Return the names of the bosses an item is tied to."""
    item_id = _item(placement_data, name, category).id
    bosses = {boss.id: boss for boss in placement_data.bosses}
    return {
        bosses[row.boss_instance_id].name
        for row in item_locations(placement_data.placements)
        if row.item_id == item_id and row.boss_instance_id is not None
    }


def test_every_item_but_consumables_has_a_row(placement_data: PlacementData) -> None:
    placed = {row.item_id for row in item_locations(placement_data.placements)}
    wanted = {
        item.id
        for item in placement_data.table
        if needs_location(item, placement_data.found_nowhere)
    }

    assert wanted - placed == set()


def test_no_consumable_and_not_none_has_a_row(placement_data: PlacementData) -> None:
    placed = {row.item_id for row in item_locations(placement_data.placements)}
    consumables = {item.id for item in placement_data.table if item.category == "consumable"}

    assert consumables
    assert placed & consumables == set()
    assert "none" not in placed


def test_rows_are_distinct(placement_data: PlacementData) -> None:
    rows = item_locations(placement_data.placements)

    assert len(rows) == len(set(rows))


def test_row_needs_exactly_one_key() -> None:
    assert ItemLocation("a", location_id="b").boss_instance_id is None
    assert ItemLocation("a", boss_instance_id="b").location_id is None
    with pytest.raises(BuildError, match="exactly one"):
        ItemLocation("a")
    with pytest.raises(BuildError, match="exactly one"):
        ItemLocation("a", location_id="b", boss_instance_id="c")


def test_every_boss_tag_in_the_sources_is_known(sources: GapSources) -> None:
    tags = {tag for slot in sources.slots for tag in slot.tags if "boss" in tag}

    assert tags == BOSS_SLOT_TAGS | BOSS_SHOP_TAGS


def test_no_row_is_at_the_roundtable(placement_data: PlacementData) -> None:
    locations = {row.location_id for row in item_locations(placement_data.placements)}

    assert "roundtable" not in locations
    assert _places(placement_data, "Rogier's Rapier") == {"limgrave"}


@pytest.mark.parametrize(
    ("item", "boss"),
    [
        ("Night's Cavalry Helm", "Night's Cavalry Duo"),
        ("Bloodhound's Fang", "Bloodhound Knight Darriwil"),
        ("Leda's Sword", "Leda and Allies"),
        ("Parrying Dagger", "Patches"),
        ("Serpent-Hunter", "Godskin Noble"),
    ],
)
def test_a_fight_drop_is_tied_to_its_boss(
    placement_data: PlacementData, item: str, boss: str
) -> None:
    assert boss in _bosses_of(placement_data, item)


@pytest.mark.parametrize(
    ("item", "areas"),
    [
        ("Scaled Helm", {"volcano"}),
        ("Eleonora's Poleblade", {"altus", "mountaintops"}),
    ],
)
def test_an_item_a_later_quest_unlocks_is_found_only_there(
    placement_data: PlacementData, item: str, areas: set[str]
) -> None:
    item_id = _item(placement_data, item).id
    rows = [row for row in item_locations(placement_data.placements) if row.item_id == item_id]
    assert {row.location_id for row in rows} == areas


def test_gostoc_sells_before_godrick_dies(placement_data: PlacementData) -> None:
    assert _bosses_of(placement_data, "Bandit Garb") == set()


def test_either_of_two_bosses_can_open_one_item(placement_data: PlacementData) -> None:
    item = _item(placement_data, "Erdtree Bow", None).id
    rows = [row for row in item_locations(placement_data.placements) if row.item_id == item]
    assert all(row.location_id is None for row in rows)
    labels = {
        (boss.name, boss.location_label)
        for boss in placement_data.bosses
        if boss.id in {row.boss_instance_id for row in rows}
    }
    assert labels == {
        ("Godfrey, First Elden Lord", "Leyndell, Royal Capital"),
        ("Sir Gideon Ofnir, the All-Knowing", "Leyndell, Ashen Capital"),
    }


def test_every_boss_at_odds_zero_ties_an_item(placement_data: PlacementData) -> None:
    tied = {row.boss_instance_id for row in item_locations(placement_data.placements)}

    assert {boss.id for boss in placement_data.bosses if boss.odds == 0} <= tied


@pytest.mark.parametrize(
    ("item", "place"),
    [
        ("Morgott's Cursed Sword", "Morgott, the Omen King @ Leyndell, Royal Capital"),
        ("Rellana's Twin Blades", f"Rellana, Twin Moon Knight @ {ENSIS}"),
    ],
)
def test_what_enia_sells_is_tied_to_the_boss(
    placement_data: PlacementData, item: str, place: str
) -> None:
    assert _places(placement_data, item) == {place}


def test_enia_gives_no_row_at_the_roundtable_or_limgrave(placement_data: PlacementData) -> None:
    assert not any(place == "limgrave" for place in _places(placement_data, "Hand of Malenia"))


def test_ash_takes_its_weapons_rows_boss_tied_ones_too(placement_data: PlacementData) -> None:
    assert _places(placement_data, "Spinning Gravity Thrust") == _places(
        placement_data, "Sword Lance"
    )
    assert _bosses_of(placement_data, "Spinning Gravity Thrust") == {"Commander Gaius"}
    assert _places(placement_data, "Glintblade Phalanx", "ash") == _places(
        placement_data, "Rogier's Rapier"
    )
    assert _places(placement_data, "Piercing Fang") == _places(placement_data, "Nagakiba")
    assert _places(placement_data, "Braggart's Roar") >= _places(placement_data, "Battle Hammer")
    assert _bosses_of(placement_data, "Palm Blast") == {"Leda and Allies", "Dryleaf Dane"}


def test_a_fleeing_dragon_is_at_its_final_location_only(placement_data: PlacementData) -> None:
    assert _places(placement_data, "Lansseax's Glaive") == {
        f"Ancient Dragon Lansseax @ {RAMPARTSIDE}"
    }
    assert _places(placement_data, "Adula's Moonblade") == {f"Glintstone Dragon Adula @ {MOONFOLK}"}
    locations = {boss.name: boss.location_id for boss in placement_data.bosses}
    assert placement_data.region_of_location[locations["Ancient Dragon Lansseax"]] == "altus"
    assert placement_data.region_of_location[locations["Glintstone Dragon Adula"]] == "ainsel"


def test_only_the_upgraded_copy_gives_its_ash(placement_data: PlacementData) -> None:
    ash = _places(placement_data, "Spinning Strikes")

    assert ash
    assert ash < _places(placement_data, "Banished Knight's Halberd")


def test_the_incantation_and_the_weapon_stay_apart(placement_data: PlacementData) -> None:
    assert _places(placement_data, "Beast Claw") == {"gravesite"}
    assert _places(placement_data, "Beast Claw (Incantation)") == {"dragonbarrow"}


def test_an_item_from_one_drop_csv_only_is_placed(placement_data: PlacementData) -> None:
    for name in ("Night Maiden Armor", "Bloodsoaked Tabard", "Gelmir Glintstone Staff"):
        assert _places(placement_data, name)


def test_named_placements_hold(placement_data: PlacementData) -> None:
    assert _places(placement_data, "Butchering Knife") == {"altus"}
    assert _places(placement_data, "Guardian Garb (Full Bloom)") == {"leyndell"}
    assert _places(placement_data, "Mushroom Crown") == {"lakeofrot"}
    assert _places(placement_data, "White Mask") == {"mohgwyn"}
    assert _places(placement_data, "Finger Robe (High Priest Robe, Altered)") == _places(
        placement_data, "High Priest Robe"
    )


def test_every_tool_is_placed(placement_data: PlacementData) -> None:
    placed = {row.item_id for row in item_locations(placement_data.placements)}
    tools = [item for item in placement_data.table if item.category == "tool"]

    assert tools
    assert all(tool.id in placed for tool in tools)


def test_a_staff_and_a_seal_are_reachable_at_every_cumulative_selection(
    placement_data: PlacementData,
) -> None:
    bosses = {boss.id: boss for boss in placement_data.bosses}
    rows = item_locations(placement_data.placements)
    items = {item.id: item for item in placement_data.table}
    selected: list[str] = []
    for region in placement_data.regions:
        selected.append(region.id)
        found = eligible_items(rows, selected, (), bosses, placement_data.region_of_location)
        weapon_classes = {items[item_id].subcategory for item_id in found}
        assert {"glintstone_staff", "sacred_seal"} <= weapon_classes, region.id


def test_every_armor_set_can_roll_under_some_selection(placement_data: PlacementData) -> None:
    bosses = {boss.id: boss for boss in placement_data.bosses}
    rows = item_locations(placement_data.placements)
    dead = set(bosses)
    regions = [region.id for region in placement_data.regions]
    with_ashen = eligible_items(rows, regions, dead, bosses, placement_data.region_of_location)
    without = eligible_items(
        rows, set(regions) - {ASHEN_CAPITAL}, dead, bosses, placement_data.region_of_location
    )

    placed = {row.item_id for row in rows}
    reachable = {*eligible_sets(placement_data.armor_sets, with_ashen, placed)}
    reachable |= {*eligible_sets(placement_data.armor_sets, without, placed)}
    assert reachable == set(placement_data.armor_sets)


def test_a_set_with_an_unreachable_piece_is_filtered(placement_data: PlacementData) -> None:
    mushroom = next(row for row in placement_data.armor_sets if row.name == "Mushroom Set")

    placed = set(mushroom.pieces)

    assert mushroom not in eligible_sets([mushroom], set(mushroom.pieces[1:]), placed)
    assert mushroom in eligible_sets([mushroom], set(mushroom.pieces), placed)


def test_a_piece_found_nowhere_counts_everywhere(placement_data: PlacementData) -> None:
    naked = next(row for row in placement_data.armor_sets if row.name == "Naked Set")
    placed = {row.item_id for row in item_locations(placement_data.placements)}

    assert set(naked.pieces) == placement_data.found_nowhere
    assert naked in eligible_sets([naked], set(), placed)


BOSSES = {
    "alive": BossInstance("alive", "Alive", "tile", "Tile"),
    "dead": BossInstance("dead", "Dead", "tile", "Tile"),
    "zero": BossInstance("zero", "Zero", "tile", "Tile", odds=0),
}
HERE = {"tile", "spot"}
NOWHERE: set[str] = set()


@pytest.mark.parametrize(
    ("row", "locations", "counts"),
    [
        (ItemLocation("i", location_id="spot"), HERE, True),
        (ItemLocation("i", location_id="spot"), NOWHERE, False),
        (ItemLocation("i", boss_instance_id="alive"), HERE, False),
        (ItemLocation("i", boss_instance_id="alive"), NOWHERE, False),
        (ItemLocation("i", boss_instance_id="dead"), HERE, True),
        (ItemLocation("i", boss_instance_id="dead"), NOWHERE, True),
        (ItemLocation("i", boss_instance_id="zero"), HERE, True),
        (ItemLocation("i", boss_instance_id="zero"), NOWHERE, False),
    ],
)
def test_row_eligibility_follows_the_prd_table(
    row: ItemLocation, locations: set[str], counts: bool
) -> None:
    assert row_counts(row, locations, {"dead", "zero"}, BOSSES) is counts


def test_the_ashen_capital_replaces_the_royal_one_but_not_the_shunning_grounds(
    placement_data: PlacementData,
) -> None:
    regions = placement_data.region_of_location
    royal = selected_locations({ROYAL_CAPITAL}, regions)
    ashen = selected_locations({ASHEN_CAPITAL}, regions)
    both = selected_locations({ROYAL_CAPITAL, ASHEN_CAPITAL}, regions)

    assert royal > SHUNNING_GROUNDS
    assert ashen > SHUNNING_GROUNDS
    assert "leyndell" in royal
    assert "leyndell" not in ashen
    assert both == ashen
    assert {regions[location] for location in SHUNNING_GROUNDS} == {ROYAL_CAPITAL}


def test_the_shunning_grounds_keep_their_items_in_the_ashen_capital(
    placement_data: PlacementData,
) -> None:
    bosses = {boss.id: boss for boss in placement_data.bosses}
    rows = item_locations(placement_data.placements)
    found = eligible_items(rows, {ASHEN_CAPITAL}, (), bosses, placement_data.region_of_location)

    assert _item(placement_data, "Frenzied Flame Seal").id in found
    assert _item(placement_data, "Omen Armor").id in found
    assert _item(placement_data, "Coded Sword").id not in found


def _item_row(name: str) -> Item:
    return new_item(name, "weapon")


def _slot(line: str, *, tags: tuple[str, ...] = (), area: str = "here", text: str = "") -> ItemSlot:
    return ItemSlot(
        key="k",
        area=area,
        text=text,
        tags=tags,
        full_areas=(),
        quest_reqs=(),
        event=None,
        until=None,
        item_name=None,
        debug_lines=(line,),
        items=(),
    )


def _table(*rows: tuple[str, str, str]) -> CsvTable:
    return CsvTable(
        path=Path("drops.csv"), header_row=0, header=("Location", "Name", "Drop 1"), rows=rows
    )


def _fake_sources(sources: GapSources, *slots: ItemSlot) -> PlacementSources:
    empty = _table()
    names: PlacementNames = replace(
        placement_names(sources.table, sources.catalog, sources.variants),
        items={"Sword": _item_row("Sword")},
        ashes={},
        renames={},
    )
    return PlacementSources(
        names=names,
        slots=slots,
        drops=empty,
        lots=CsvTable(path=Path("lots.csv"), header_row=0, header=("Location #1", "Name"), rows=()),
        bosses=(
            BossInstance("a", "First", "here", "Tile"),
            BossInstance("b", "Second", "here", "Tile"),
            BossInstance("c", "Other", "here", "Lone"),
        ),
        merged_labels={},
        aliases={},
        remembrances={},
        armor_shops={},
        slot_links={},
        moved_areas={},
        drop_areas={},
        ash_sources={},
    )


def _line(label: str, enemy: str = "Model") -> str:
    return f"Sword - lot 1[event enemy c1_1 ({enemy} - id 1) in m10_00_00_00 ({label}), x] Sword"


def _built(sources: PlacementSources) -> tuple[Placement, ...]:
    return build_placements(sources)


def test_a_label_with_one_boss_needs_no_name(sources: GapSources) -> None:
    built = _built(_fake_sources(sources, _slot(_line("Lone"), tags=("altboss",))))

    assert [placement.row.boss_instance_id for placement in built] == ["c"]


def test_the_slot_text_picks_among_a_labels_bosses(sources: GapSources) -> None:
    slot = _slot(_line("Tile"), tags=("boss",), text="Dropped by Second in a cave")

    built = _built(_fake_sources(sources, slot))

    assert [placement.row.boss_instance_id for placement in built] == ["b"]


def test_a_merged_label_offers_its_own_fights_and_the_moved_one(sources: GapSources) -> None:
    fake = _fake_sources(sources, _slot(_line("Tile"), tags=("boss",), text="Dropped by Other"))

    assert _built(replace(fake, merged_labels={"Tile": "Lone"}))[0].row.boss_instance_id == "c"

    fake = _fake_sources(sources, _slot(_line("Tile"), tags=("boss",), text="Dropped by First"))

    assert _built(replace(fake, merged_labels={"Tile": "Lone"}))[0].row.boss_instance_id == "a"


def test_a_boss_slot_nothing_joins_stops_the_build(sources: GapSources) -> None:
    with pytest.raises(BuildError, match="label has First, Second"):
        _built(_fake_sources(sources, _slot(_line("Tile"), tags=("boss",))))
    with pytest.raises(BuildError, match="label has no boss"):
        _built(_fake_sources(sources, _slot(_line("Nowhere"), tags=("boss",))))


def test_a_slot_with_no_boss_tag_gives_a_location(sources: GapSources) -> None:
    built = _built(_fake_sources(sources, _slot(_line("Tile"))))

    assert [placement.row.location_id for placement in built] == ["here"]


def test_an_unused_slot_link_stops_the_build(sources: GapSources) -> None:
    fake = replace(
        _fake_sources(sources, _slot(_line("Tile"))),
        slot_links={("Sword", "elsewhere"): (("First", "Tile"),)},
    )

    with pytest.raises(BuildError, match="Sword at elsewhere"):
        _built(fake)


def test_a_moved_slot_line_gives_its_new_areas_and_an_unused_move_stops_the_build(
    sources: GapSources,
) -> None:
    fake = _fake_sources(sources, _slot(_line("Tile")))

    built = _built(replace(fake, moved_areas={("Sword", "here"): ("there", "yonder")}))

    assert [placement.row.location_id for placement in built] == ["there", "yonder"]
    with pytest.raises(BuildError, match="placement_areas names no slot line: Sword at elsewhere"):
        _built(replace(fake, moved_areas={("Sword", "elsewhere"): ("there",)}))


def test_a_slot_link_to_no_boss_stops_the_build(sources: GapSources) -> None:
    fake = replace(
        _fake_sources(sources, _slot(_line("Tile"))),
        slot_links={("Sword", "here"): (("Ghost", "Tile"),)},
    )

    with pytest.raises(BuildError, match="no boss instance 'Ghost'"):
        _built(fake)


def test_a_boss_row_with_a_pool_drop_stops_the_build(sources: GapSources) -> None:
    fake = replace(
        _fake_sources(sources),
        drops=_table(("Tile", "First [Boss]", "Sword - {1} (10%) [True]")),
        aliases={"Tile": "here"},
    )

    with pytest.raises(BuildError, match="boss row"):
        _built(fake)


def test_a_drop_on_a_label_with_no_alias_stops_the_build(sources: GapSources) -> None:
    fake = replace(
        _fake_sources(sources),
        drops=_table(("Tile", "Enemy", "Sword - {1} (10%) [True]")),
    )

    with pytest.raises(BuildError, match="no alias"):
        _built(fake)


def test_a_drop_on_a_non_place_gives_nothing(sources: GapSources) -> None:
    fake = replace(
        _fake_sources(sources),
        drops=_table(("Unused", "Enemy", "Sword - {1} (10%) [True]")),
    )

    assert _built(fake) == ()


def test_a_slot_link_row_needs_every_cell(tmp_path: Path) -> None:
    path = tmp_path / "links.csv"
    path.write_text(
        "item,area,boss,location_label,reason\nSword,here,First,Tile,\n",
        encoding="utf-8",
    )

    with pytest.raises(LoaderError, match="empty reason"):
        load_slot_links(path)


def test_a_slot_link_label_drops_the_dlc_prefix(tmp_path: Path) -> None:
    path = tmp_path / "links.csv"
    path.write_text(
        "item,area,boss,location_label,reason\nSword,here,First,[DLC] Tile,why\n",
        encoding="utf-8",
    )

    assert load_slot_links(path) == {("Sword", "here"): (("First", "Tile"),)}


def test_a_slot_link_can_name_two_bosses_but_not_one_twice(tmp_path: Path) -> None:
    header = "item,area,boss,location_label,reason\n"
    first = "Sword,here,First,Tile,why\n"
    path = tmp_path / "links.csv"
    path.write_text(f"{header}{first}Sword,here,Second,Tile,why\n", encoding="utf-8")

    assert load_slot_links(path) == {("Sword", "here"): (("First", "Tile"), ("Second", "Tile"))}

    path.write_text(f"{header}{first}{first}", encoding="utf-8")
    with pytest.raises(LoaderError, match="duplicate row"):
        load_slot_links(path)
