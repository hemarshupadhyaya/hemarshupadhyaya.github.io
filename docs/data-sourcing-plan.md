# Data Sourcing Plan — Shape of Drug Development

## 1. Purpose

This document defines how the visual essay obtains its data, and the rules
that keep it reproducible and trustworthy.

The visual essay must only render data that:

- comes from the public data repo
  [shape-of-drug-development-data-clean](https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean),
- was produced by that repo's pipeline against public FDA CDER sources,
- is pinned to a specific source commit recorded alongside the snapshot.

No data is generated, edited, or transformed inside this site repo.
No values are typed by hand into the essay.

---

## 2. Boundary between repos

| Concern | Lives in |
| --- | --- |
| Raw FDA source files, scrapers, ingestion | data repo |
| Cleaning, deduplication, enrichment | data repo |
| Chart-ready JSON exports | data repo |
| Schema and column documentation | data repo |
| Copying exports into a static site | this repo |
| Visual storytelling, charts, copy | this repo |
| Snapshot manifest (commit pin) | this repo |

If any chart needs a new shape of data, the change happens **in the data repo
first** — a new export — and then this repo syncs it. This repo never reshapes
data at runtime beyond presentation-level filtering and grouping.

---

## 3. The reproducibility contract

A reader (or a future me) must be able to:

1. Open the live essay.
2. See the source commit hash in the methodology section.
3. Check out that commit in the data repo.
4. Re-run the data repo's export pipeline.
5. Get byte-identical (or row-identical, after sorting) JSON to what the
   essay is rendering.

This is the test for "reproducible." If any step breaks, the contract is broken.

---

## 4. Sync mechanism — how data gets here

### 4.1 The script (already in repo)

`scripts/sync-shape-data.sh` is the only supported way to populate
`public/data/shape-of-drug-development/`. Its rules:

- Takes one argument: the local path to a clone of the data repo.
- Fails if that path is not a git repo.
- Fails if any v0.1-required JSON file is missing from the data repo.
- Copies v0.1 required and v0.2 optional exports.
- Captures the source repo URL, branch, commit, and UTC timestamp into
  `data-snapshot.json`.
- Refuses to fall back to internet downloads.
- Refuses to write to or modify the source data repo.

### 4.2 Required inputs (v0.1)

```text
approval_trends_by_year.json
approvals_by_application_type_by_year.json
expedited_pathways_by_year.json
fda_nme_approvals_clean.json
```

### 4.3 Optional inputs (v0.2 and later)

```text
orphan_drug_trends_by_year.json
first_in_class_by_year.json
therapeutic_area_counts.json
therapeutic_area_by_period.json
therapeutic_area_heatmap_by_5yr_period.json
dosage_form_trends_by_year.json
fda_nme_approvals_with_therapeutic_area.json
```

### 4.4 The manifest

Every sync writes `public/data/shape-of-drug-development/data-snapshot.json`:

```json
{
  "source_repo": "https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean",
  "source_branch": "main",
  "source_commit": "<full sha>",
  "synced_at": "<UTC ISO-8601>",
  "data_year_range": "<filled by hand or follow-up tooling>",
  "notes": ""
}
```

The methodology section reads this file at runtime and surfaces the commit
and timestamp to the reader.

---

## 5. Rules for editors

These rules are the difference between a reproducible essay and a one-off.

1. Do not edit JSON files under `public/data/shape-of-drug-development/`
   by hand. Ever. Not even a typo fix.
2. Do not commit JSON whose origin you cannot point to with a commit hash
   in the data repo.
3. Do not add a chart that depends on data not exported by the data repo.
   If a chart needs new data, file it in the data repo, ship the export,
   then sync.
4. Re-running the sync script must always overwrite, never merge, the JSON
   files. (The current script does this.)
5. The `data-snapshot.json` file in `public/` is the source of truth.
   Build copies it through to `essays/`. Do not edit the built copy.
6. After every sync, review `git diff public/data/shape-of-drug-development/`
   before committing. Look for unexpected row count changes, year range
   shifts, or column drops. Treat any surprise as a data repo issue, not
   a site issue.

---

## 6. Workflow — refreshing data

The full reproducible loop, end to end:

```bash
# 1. Make sure the data repo is up to date locally.
cd ../shape-of-drug-development-data-clean
git pull
# (re-run its export pipeline if needed — see that repo's README)

# 2. Sync exports into this repo.
cd ../hemarshupadhyaya.github.io
./scripts/sync-shape-data.sh ../shape-of-drug-development-data-clean

# 3. Inspect the diff.
git diff public/data/shape-of-drug-development/

# 4. Optionally enrich the manifest (year range, notes).
$EDITOR public/data/shape-of-drug-development/data-snapshot.json

# 5. Rebuild the essay so essays/ matches public/.
./scripts/build-shape-essay.sh

# 6. Commit data + build together so they are never out of sync.
git add public/data/shape-of-drug-development \
        essays/shape-of-drug-development
git commit -m "Refresh data snapshot — <data-repo-short-sha>"
```

The commit message should reference the data repo short SHA so that
`git log` alone tells the data refresh story.

---

## 7. Verifying a build matches its data

Before publishing a refresh, confirm:

- `data-snapshot.json` `source_commit` matches `git -C ../shape-of-drug-development-data-clean rev-parse HEAD`.
- `data-snapshot.json` `synced_at` is recent.
- `essays/shape-of-drug-development/data-snapshot.json` is identical to the
  one in `public/` (a build artifact mismatch means the build was stale).
- The essay loads in a browser and the methodology section shows the
  expected commit/date.

A simple invariant check (run from the repo root):

```bash
diff -q \
  public/data/shape-of-drug-development/data-snapshot.json \
  essays/shape-of-drug-development/data-snapshot.json
```

If that prints anything, rebuild before pushing.

---

## 8. What is explicitly out of scope

- No runtime fetching from FDA, OpenFDA, or any third-party API.
  The essay must render correctly with the network disabled after first load.
- No bundled CSV/Excel imports from the data repo. Only the chart-ready
  JSON exports listed above are used.
- No private, employer, or unpublished data. If a chart cannot be drawn
  from the public data repo alone, the chart does not ship.
- No automated GitHub Actions data sync in v0.1. We want a human looking
  at the diff each refresh. Automation can come once the schema is stable.

---

## 9. Future improvements (not v0.1)

These are deliberately deferred and listed only so they are not invented
ad hoc later:

- A `--check` mode for the sync script that verifies snapshot freshness
  without copying.
- A schema validator (e.g. JSON Schema) per export, run during sync.
- A row-count and year-range summary printed by the sync script for
  faster diff review.
- A GitHub Actions job that opens a PR when the data repo's `main` advances,
  with the sync diff prepopulated.
- Pulling exports straight from a tagged release of the data repo
  (e.g. `data-2026-Q2`) instead of `HEAD`, once releases are cut there.

Each of these requires the data repo to expose more structure first, so
they are paired with data-repo work, not site-repo work.
