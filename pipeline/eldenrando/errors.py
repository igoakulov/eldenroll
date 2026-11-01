"""Errors raised while assembling rows from loaded sources.

Loaders report bad source files with `LoaderError`. Once the sources parse, the build layer
joins them into rows; a failed join is a `BuildError`, never a partial result.
"""

from __future__ import annotations


class BuildError(Exception):
    """Raised when loaded sources cannot be assembled into a valid row set."""
