#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PKG="$ROOT/package.json"
CONF="$ROOT/src-tauri/tauri.conf.json"
ENV_FILE="$ROOT/.env.release"

if [[ ! -f "$PKG" || ! -f "$CONF" ]]; then
  echo "release: package.json or tauri.conf.json not found in $ROOT" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Load Apple signing / notarization credentials from .env.release if present.
# The file is gitignored. See .env.release.example for the expected keys.
# ---------------------------------------------------------------------------
SIGN_MODE="unsigned"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  echo "release: loaded credentials from .env.release"
fi

if [[ -n "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  SIGN_MODE="signed"
  if [[ -n "${APPLE_ID:-}" && -n "${APPLE_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]]; then
    SIGN_MODE="signed+notarized"
  elif [[ -n "${APPLE_API_ISSUER:-}" && -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_KEY_PATH:-}" ]]; then
    SIGN_MODE="signed+notarized"
  fi
fi

echo "release: sign mode = $SIGN_MODE"

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
# Tauri picks up APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID
# (or APPLE_API_ISSUER/KEY/PATH) from the environment and signs + notarizes
# automatically when they are set.
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

# ---------------------------------------------------------------------------
# Post-build verification. Only runs if signing was attempted.
# ---------------------------------------------------------------------------
if [[ "$SIGN_MODE" != "unsigned" ]]; then
  APP_DIR="$ROOT/src-tauri/target/release/bundle/macos"
  APP_BUNDLE=$(find "$APP_DIR" -maxdepth 1 -type d -name '*.app' -print -quit || true)

  if [[ -n "${APP_BUNDLE:-}" ]]; then
    echo "release: verifying signature on $(basename "$APP_BUNDLE")"
    codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE" || {
      echo "release: codesign verify FAILED" >&2
      exit 1
    }
  fi

  echo "release: verifying Gatekeeper acceptance on DMG"
  if spctl -a -t open --context context:primary-signature -v "$OUT" 2>&1; then
    echo "release: Gatekeeper accepts $OUT"
  else
    echo "release: Gatekeeper rejected the DMG (may still be pending notarization)" >&2
  fi

  if [[ "$SIGN_MODE" == "signed+notarized" ]]; then
    echo "release: checking notarization staple on DMG"
    if xcrun stapler validate "$OUT"; then
      echo "release: notarization staple OK"
    else
      echo "release: no staple yet — Tauri may have submitted but not stapled; you can run 'xcrun stapler staple $OUT' after notarization completes" >&2
    fi
  fi
fi

echo "release: done ($SIGN_MODE)"
