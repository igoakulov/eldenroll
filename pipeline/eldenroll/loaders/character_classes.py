"""`selectors` holds `kind:id id` parts split by `;`, because the ids are slugs and a cell stays
free of quoting. A part with no ids, such as `rule:`, means every option of that kind. A class's
optional `two_handed` is `yes` or empty. `opened_by`,
an optional column, names the boss instance whose felling opens the slot; empty means always open.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from eldenroll.loaders.csv_source import read_table
from eldenroll.loaders.odds import parse_odds
from eldenroll.loaders.schema import LoaderError
from eldenroll.model.character_class import CharacterClass
from eldenroll.model.vocabulary import CHARACTER_CLASSES, SLOTS


@dataclass(frozen=True, slots=True)
class SlotPoolRow:
    character_class_id: str
    slot: str
    selectors: tuple[tuple[str, tuple[str, ...]], ...]
    opened_by: str | None = None


def load_character_classes(path: Path) -> tuple[CharacterClass, ...]:
    table = read_table(path, required_columns=("id", "name", "odds"))
    two_handed = table.column("two_handed") if "two_handed" in table.header else None
    flags = [row[two_handed] if two_handed is not None else "" for row in table.rows]
    bad = sorted({flag for flag in flags if flag not in ("", "yes")})
    if bad:
        raise LoaderError(f"{path}: two_handed must be yes or empty, not {', '.join(bad)}")
    character_classes = tuple(
        CharacterClass(
            id=row[table.column("id")],
            name=row[table.column("name")],
            odds=parse_odds(path, row[table.column("id")], row[table.column("odds")]),
            two_handed=flag == "yes",
        )
        for row, flag in zip(table.rows, flags, strict=True)
    )
    if tuple(character_class.id for character_class in character_classes) != CHARACTER_CLASSES:
        raise LoaderError(f"{path}: expected the character classes {', '.join(CHARACTER_CLASSES)}")
    empty = sorted(
        character_class.id for character_class in character_classes if not character_class.name
    )
    if empty:
        raise LoaderError(f"{path}: empty name on {', '.join(empty)}")
    return character_classes


def load_slot_pools(path: Path) -> tuple[SlotPoolRow, ...]:
    table = read_table(path, required_columns=("character_class_id", "slot", "selectors"))
    opened_by = table.column("opened_by") if "opened_by" in table.header else None
    rows: list[SlotPoolRow] = []
    for index, row in enumerate(table.rows, start=1):
        where = f"{path}: data row {index}"
        character_class_id = row[table.column("character_class_id")]
        slot = row[table.column("slot")]
        if character_class_id not in CHARACTER_CLASSES:
            raise LoaderError(f"{where}: unknown character class {character_class_id!r}")
        if slot not in SLOTS:
            raise LoaderError(f"{where}: unknown slot {slot!r}")
        rows.append(
            SlotPoolRow(
                character_class_id,
                slot,
                parse_selectors(row[table.column("selectors")], where),
                (row[opened_by] or None) if opened_by is not None else None,
            )
        )
    return tuple(rows)


def parse_selectors(cell: str, where: str) -> tuple[tuple[str, tuple[str, ...]], ...]:
    out: list[tuple[str, tuple[str, ...]]] = []
    for part in filter(None, (text.strip() for text in cell.split(";"))):
        out.append(parse_selector(part, where))
    return tuple(out)


def parse_selector(part: str, where: str) -> tuple[str, tuple[str, ...]]:
    kind, colon, ids = part.partition(":")
    if not colon:
        raise LoaderError(f"{where}: selector {part!r} has no kind")
    return kind.strip(), tuple(ids.split())
