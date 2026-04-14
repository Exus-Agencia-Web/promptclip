#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PKG="$ROOT/package.json"
CONF="$ROOT/src-tauri/tauri.conf.json"

if [[ ! -f "$PKG" || ! -f "$CONF" ]]; then
  echo "release: package.json or tauri.conf.json not found in $ROOT" >&2
  exit 1
fi

PREV=$(node -p "require('$PKG').version")

# Bump patch in package.json (no git commit, no tag).
npm version patch --no-git-tag-version >/dev/null

NEW=$(node -p "require('$PKG').version")
echo "release: $PREV -> $NEW"

# Keep tauri.conf.json in sync so the bundler embeds the same version.
node -e "
const fs = require('fs');
const path = '$CONF';
const conf = JSON.parse(fs.readFileSync(path, 'utf8'));
conf.package = conf.package || {};
conf.package.version = '$NEW';
fs.writeFileSync(path, JSON.stringify(conf, null, 2) + '\n');
"

# Keep the README download link in sync. Replaces any PromptClip-X.Y.Z.dmg
# reference so the link always points to the freshly built DMG.
README="$ROOT/README.md"
if [[ -f "$README" ]]; then
  sed -i '' -E "s/PromptClip-[0-9]+\.[0-9]+\.[0-9]+\.dmg/PromptClip-$NEW.dmg/g" "$README"
  echo "release: README download link updated to $NEW"
fi

# Build the .app + .dmg bundle.
npm run tauri build

# Locate the generated .dmg (Tauri 1.x emits into src-tauri/target/release/bundle/dmg/).
DMG_DIR="$ROOT/src-tauri/target/release/bundle/dmg"
if [[ ! -d "$DMG_DIR" ]]; then
  echo "release: bundle dir not found at $DMG_DIR" >&2
  exit 1
fi

DMG_SRC=$(find "$DMG_DIR" -maxdepth 1 -type f -name '*.dmg' -print -quit)
if [[ -z "${DMG_SRC:-}" ]]; then
  echo "release: no .dmg produced in $DMG_DIR" >&2
  exit 1
fi

OUT="$ROOT/PromptClip-$NEW.dmg"

# Build succeeded — remove any previous PromptClip-*.dmg at the repo root
# before publishing the new one. Only runs past this point on success
# because of `set -e`.
shopt -s nullglob
for old in "$ROOT"/PromptClip-*.dmg; do
  if [[ "$old" != "$OUT" ]]; then
    rm -f "$old"
    echo "release: removed previous $(basename "$old")"
  fi
done
shopt -u nullglob

cp -f "$DMG_SRC" "$OUT"

echo "release: wrote $OUT"
