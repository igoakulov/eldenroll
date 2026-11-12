"""Each row links to its Fextralife page, built from its name, because Fextralife refuses scripted
reads and no build step checks a link. A page the name doesn't reach is an override in
`data/overrides/wiki_urls.csv` (`data/sources/README.md#Wiki lookups`).
"""

from __future__ import annotations

import unicodedata
from collections.abc import Mapping
from dataclasses import replace
from urllib.parse import quote

from eldenroll.errors import BuildError
from eldenroll.model.database import Database

WIKI_BASE = "https://eldenring.wiki.fextralife.com/"
KINDS: tuple[str, ...] = ("item", "armor_set", "boss_instance")
_ASH_OF_WAR = "Ash of War"
_SAFE = "'(),:"


def wiki_url(page: str) -> str:
    """Return the URL of a page named as the wiki names it: accents dropped, spaces as `+`."""
    plain = "".join(
        char for char in unicodedata.normalize("NFKD", page) if not unicodedata.combining(char)
    )
    return WIKI_BASE + "+".join(quote(part, safe=_SAFE) for part in plain.split(" "))


def wiki_page(name: str, category: str) -> str:
    """Return an Ash of War's page as `Ash of War: <name>`, unless its name already says so. The
    wiki's naming for ashes is read from its pages, not verified.
    """
    if category == "ash" and not name.startswith(_ASH_OF_WAR):
        return f"{_ASH_OF_WAR}: {name}"
    return name


def with_wiki_urls(database: Database, overrides: Mapping[tuple[str, str], str]) -> Database:
    """Set `url` on every item, armor set and boss. A rollable row gets its page; `none` and a row
    at odds 0 get no link. An override replaces the built URL, and an empty one means no link.
    """
    ids: dict[str, set[str]] = {
        "item": {row.id for row in database.items},
        "armor_set": {row.id for row in database.armor_sets},
        "boss_instance": {row.id for row in database.bosses},
    }
    unknown = sorted(
        f"{kind} {row_id}"
        for kind, row_id in overrides
        if kind not in ids or row_id not in ids[kind]
    )
    if unknown:
        raise BuildError(f"wiki_urls names no row: {', '.join(unknown)}")
    bad = sorted(
        f"{kind} {row_id}"
        for (kind, row_id), url in overrides.items()
        if url and not url.startswith(WIKI_BASE)
    )
    if bad:
        raise BuildError(f"wiki_urls holds a link that is not a Fextralife page: {', '.join(bad)}")

    def link(kind: str, row_id: str, page: str | None, odds: float) -> str | None:
        if (kind, row_id) in overrides:
            return overrides[kind, row_id] or None
        return None if page is None or odds <= 0 else wiki_url(page)

    return replace(
        database,
        items=tuple(
            replace(
                row,
                url=link(
                    "item",
                    row.id,
                    None if row.category == "none" else wiki_page(row.name, row.category),
                    row.odds,
                ),
            )
            for row in database.items
        ),
        armor_sets=tuple(
            replace(row, url=link("armor_set", row.id, row.name, row.odds))
            for row in database.armor_sets
        ),
        bosses=tuple(
            replace(row, url=link("boss_instance", row.id, row.name, row.odds))
            for row in database.bosses
        ),
    )
