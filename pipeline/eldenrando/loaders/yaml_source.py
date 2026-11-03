"""Read a YAML source document from disk.

The mod's files under `data/sources/` are YAML, so one reader serves all of them. Parse and I/O
failures become `LoaderError` with the file path so the build can report what broke without a
traceback.
"""

from __future__ import annotations

from pathlib import Path

import yaml

from eldenrando.loaders.schema import LoaderError, require_mapping


def load_mapping(path: Path) -> dict[object, object]:
    """Return the document at `path` as a mapping, or raise `LoaderError`."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise LoaderError(f"{path}: cannot read ({exc})") from exc
    try:
        document = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise LoaderError(f"{path}: invalid YAML ({exc})") from exc
    if document is None:
        raise LoaderError(f"{path}: document is empty")
    return dict(require_mapping(document, str(path)))
