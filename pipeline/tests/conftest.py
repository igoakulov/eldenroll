"""The real data, loaded once for the whole session: each load takes seconds."""

from __future__ import annotations

from pathlib import Path

import pytest

from eldenroll.validate.gaps import GapSources, load_sources
from eldenroll.validate.gate_data import GateData, load_gate_data
from eldenroll.validate.placement import PlacementData, load_placement_data

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def sources() -> GapSources:
    return load_sources(ROOT)


@pytest.fixture(scope="session")
def placement_data(sources: GapSources) -> PlacementData:
    return load_placement_data(ROOT, sources)


@pytest.fixture(scope="session")
def gate_data(sources: GapSources) -> GateData:
    return load_gate_data(ROOT, sources)
