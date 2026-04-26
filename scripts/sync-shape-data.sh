#!/usr/bin/env bash
# sync-shape-data.sh
#
# Copy chart-ready JSON exports from the local data repo into this repo's
# public/data/shape-of-drug-development/ folder, and write a data-snapshot.json
# manifest pinning the source commit.
#
# Usage:
#   ./scripts/sync-shape-data.sh ../shape-of-drug-development-data-clean
#
# Rules:
#   - Does not download from the internet.
#   - Does not modify the source data repo.
#   - Fails if any v0.1-required file is missing.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <path-to-data-repo>" >&2
  exit 2
fi

SRC_REPO="$1"

if [[ ! -d "$SRC_REPO/.git" ]]; then
  echo "error: $SRC_REPO is not a git repository" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO_ROOT/public/data/shape-of-drug-development"
mkdir -p "$DEST"

# v0.1 required exports
REQUIRED=(
  "approval_trends_by_year.json"
  "approvals_by_application_type_by_year.json"
  "expedited_pathways_by_year.json"
  "fda_nme_approvals_clean.json"
)

# v0.2 optional exports (copied if present)
OPTIONAL=(
  "orphan_drug_trends_by_year.json"
  "first_in_class_by_year.json"
  "therapeutic_area_counts.json"
  "therapeutic_area_by_period.json"
  "therapeutic_area_heatmap_by_5yr_period.json"
  "dosage_form_trends_by_year.json"
  "fda_nme_approvals_with_therapeutic_area.json"
)

find_file() {
  local name="$1"
  find "$SRC_REPO" -type f -name "$name" -not -path "*/.git/*" -print -quit
}

copied=()
missing=()

for f in "${REQUIRED[@]}"; do
  src="$(find_file "$f" || true)"
  if [[ -z "${src:-}" ]]; then
    missing+=("$f")
  else
    cp "$src" "$DEST/$f"
    copied+=("$f")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "error: required files not found in $SRC_REPO:" >&2
  for f in "${missing[@]}"; do echo "  - $f" >&2; done
  exit 1
fi

for f in "${OPTIONAL[@]}"; do
  src="$(find_file "$f" || true)"
  if [[ -n "${src:-}" ]]; then
    cp "$src" "$DEST/$f"
    copied+=("$f")
  fi
done

src_commit="$(git -C "$SRC_REPO" rev-parse HEAD)"
src_branch="$(git -C "$SRC_REPO" rev-parse --abbrev-ref HEAD)"
src_remote="$(git -C "$SRC_REPO" config --get remote.origin.url || echo '')"
synced_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$DEST/data-snapshot.json" <<JSON
{
  "source_repo": "${src_remote}",
  "source_branch": "${src_branch}",
  "source_commit": "${src_commit}",
  "synced_at": "${synced_at}",
  "data_year_range": "",
  "notes": "Run scripts/sync-shape-data.sh to refresh. Update data_year_range and notes manually as needed."
}
JSON

echo "Synced ${#copied[@]} files into $DEST"
for f in "${copied[@]}"; do echo "  + $f"; done
echo "Manifest: $DEST/data-snapshot.json"
