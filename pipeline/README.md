# Pipeline

The offline Python build that turns `data/sources/` and `data/overrides/` into `data/build/db.json`. Setup and the checks are in the header of `pyproject.toml`. From `pipeline/`:

```
../.venv/bin/python -m eldenroll.build.database     # build db.json and import-report.json
../.venv/bin/python -m eldenroll.validate.gaps      # list source gaps no override answers
```

- Run everything from `pipeline/`, with the `cd` in the same command: tests run from anywhere else pass while testing nothing, and pyright reports false errors.
- Use the repo-level `.venv`. `uv run` here creates a second environment and a `uv.lock` the repo doesn't use.
- `loaders/` return source rows unchanged, so a re-parse is reproducible and no exclusion lives there; excluded items are dropped when `build/` constructs each pool.
- A row is written through its `model/` type, so a source field the model lacks can't reach `db.json`.
- `paths.py` is the one place that knows where every file lives. A file a test or the build needs goes into `data/sources/` and `paths.py` first, so a fresh clone has it.
- A test that needs the real data takes a session fixture from `tests/conftest.py`: each load takes seconds, so a module that loads its own makes the suite several times slower.
