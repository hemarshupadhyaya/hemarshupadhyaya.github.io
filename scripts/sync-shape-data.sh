#!/usr/bin/env bash
# sync-shape-data.sh
#
# Copy chart-ready JSON exports from the local data repo into this repo's
# public/data/shape-of-drug-development/ folder, and write a data-snapshot.json
# manifest pinning the source commit and copied file hashes.
#
# Usage:
#   ./scripts/sync-shape-data.sh ../shape-of-drug-development-data-clean
#   ./scripts/sync-shape-data.sh ../shape-of-drug-development-data-clean --check
#
# Rules:
#   - Does not download from the internet.
#   - Does not modify the source data repo.
#   - Fails if any v0.1-required file is missing.

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <path-to-data-repo> [--check]" >&2
  exit 2
fi

SRC_REPO="$1"
MODE="${2:-sync}"

if [[ "$MODE" != "sync" && "$MODE" != "--check" ]]; then
  echo "usage: $0 <path-to-data-repo> [--check]" >&2
  exit 2
fi

if [[ ! -d "$SRC_REPO/.git" ]]; then
  echo "error: $SRC_REPO is not a git repository" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO_ROOT/public/data/shape-of-drug-development"
BUILT="$REPO_ROOT/essays/shape-of-drug-development"
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

hash_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

json_escape() {
  python3 -c 'import json, sys; print(json.dumps(sys.argv[1])[1:-1])' "$1"
}

check_snapshot() {
  local failed=0
  local snapshot="$DEST/data-snapshot.json"
  local built_snapshot="$BUILT/data-snapshot.json"
  local src_commit

  src_commit="$(git -C "$SRC_REPO" rev-parse HEAD)"

  for f in "${REQUIRED[@]}"; do
    if [[ ! -f "$DEST/$f" ]]; then
      echo "error: missing public data file: $DEST/$f" >&2
      failed=1
    fi
  done

  if [[ ! -f "$snapshot" ]]; then
    echo "error: missing snapshot manifest: $snapshot" >&2
    failed=1
  elif ! grep -q "\"source_commit\": \"${src_commit}\"" "$snapshot"; then
    echo "error: snapshot source_commit does not match $src_commit" >&2
    failed=1
  fi

  if [[ ! -f "$built_snapshot" ]]; then
    echo "error: missing built snapshot manifest: $built_snapshot" >&2
    failed=1
  elif ! diff -q "$snapshot" "$built_snapshot" >/dev/null; then
    echo "error: public and built data-snapshot.json differ" >&2
    failed=1
  fi

  for f in "${REQUIRED[@]}" "${OPTIONAL[@]}"; do
    if [[ -f "$DEST/$f" && -f "$BUILT/$f" ]]; then
      if ! diff -q "$DEST/$f" "$BUILT/$f" >/dev/null; then
        echo "error: public and built copies differ for $f" >&2
        failed=1
      fi
    fi
  done

  if (( failed > 0 )); then
    exit 1
  fi

  echo "Snapshot check passed for $src_commit"
}

if [[ "$MODE" == "--check" ]]; then
  check_snapshot
  exit 0
fi

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

{
  cat <<JSON
{
  "source_repo": "$(json_escape "$src_remote")",
  "source_branch": "$(json_escape "$src_branch")",
  "source_commit": "$(json_escape "$src_commit")",
  "synced_at": "$(json_escape "$synced_at")",
  "data_year_range": "1985-2026 YTD",
  "notes": "2026 rows are provisional until FDA publishes final CY2026 annual report. Refresh with scripts/sync-shape-data.sh.",
  "files": {
JSON

  for i in "${!copied[@]}"; do
    f="${copied[$i]}"
    comma=","
    if [[ "$i" == "$((${#copied[@]} - 1))" ]]; then
      comma=""
    fi
    printf '    "%s": { "sha256": "%s" }%s\n' "$f" "$(hash_file "$DEST/$f")" "$comma"
  done

  cat <<JSON
  }
}
JSON
} > "$DEST/data-snapshot.json"

echo "Synced ${#copied[@]} files into $DEST"
for f in "${copied[@]}"; do echo "  + $f"; done
echo "Manifest: $DEST/data-snapshot.json"
