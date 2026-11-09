"""Parse and I/O failures become `LoaderError` with the file path, so the build reports them without
a traceback.
"""

from __future__ import annotations

from pathlib import Path

import yaml

from eldenroll.loaders.schema import LoaderError, require_mapping


def load_mapping(path: Path) -> dict[object, object]:
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
