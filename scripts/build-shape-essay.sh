#!/usr/bin/env bash
# build-shape-essay.sh
#
# Build the Shape of Drug Development visual essay and emit static files
# into essays/shape-of-drug-development/ at the repo root.
#
# Usage:
#   ./scripts/build-shape-essay.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$REPO_ROOT/essays-src/shape-of-drug-development"

cd "$PROJECT"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Building essay..."
npm run build

echo
echo "Build output: $REPO_ROOT/essays/shape-of-drug-development/"
