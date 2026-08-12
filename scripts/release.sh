#!/usr/bin/env bash
# Cuts a release: verifies the tree is clean, typechecks + builds as a
# pre-flight check, bumps the version (in package.json and src/const.ts),
# commits, tags, pushes, then builds again and publishes a GitHub release
# with dist/mbta-live-card.js attached.
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  echo "Usage: $0 <major|minor|patch|X.Y.Z>" >&2
  exit 1
}

[ $# -eq 1 ] || usage
BUMP="$1"

command -v gh >/dev/null || { echo "error: gh CLI is required" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: gh is not authenticated (run: gh auth login)" >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is not clean:" >&2
  git status --short >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "error: releases must be cut from main (currently on $BRANCH)" >&2
  exit 1
fi

echo "==> Fetching origin/main..."
git fetch origin main
if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
  echo "error: local main is not in sync with origin/main (pull or push first)" >&2
  exit 1
fi

echo "==> Installing dependencies..."
npm ci

echo "==> Typechecking..."
npm run typecheck

echo "==> Building (pre-flight check)..."
npm run build

echo "==> Bumping version ($BUMP)..."
npm version "$BUMP" --no-git-tag-version >/dev/null
NEW_VERSION="$(node -p "require('./package.json').version")"
TAG="v$NEW_VERSION"

echo "==> Syncing CARD_VERSION in src/const.ts to $NEW_VERSION..."
node -e "
const fs = require('fs');
const path = 'src/const.ts';
const version = process.argv[1];
const content = fs.readFileSync(path, 'utf8');
const pattern = /export const CARD_VERSION = \"[^\"]+\";/;
if (!pattern.test(content)) {
  console.error('error: CARD_VERSION line not found in ' + path);
  process.exit(1);
}
fs.writeFileSync(path, content.replace(pattern, \`export const CARD_VERSION = \"\${version}\";\`));
" "$NEW_VERSION"

echo "==> Rebuilding with the updated version string..."
npm run build

git add package.json package-lock.json src/const.ts
git commit -m "Release $TAG"
git tag -a "$TAG" -m "$TAG"

echo "==> Pushing commit and tag..."
git push origin main
git push origin "$TAG"

echo "==> Creating GitHub release $TAG..."
gh release create "$TAG" dist/mbta-live-card.js \
  --title "$TAG" \
  --generate-notes

RELEASE_URL="$(gh release view "$TAG" --json url -q .url)"
echo "==> Done: $RELEASE_URL"
