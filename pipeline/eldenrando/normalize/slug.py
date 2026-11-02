"""Turn a display name into the slug that becomes its id."""

from __future__ import annotations

import re
import unicodedata

_SEPARATORS = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    """Return `name` lowercased and unaccented, apostrophes dropped, other runs joined by `_`."""
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return _SEPARATORS.sub("_", plain.lower().replace("'", "")).strip("_")
