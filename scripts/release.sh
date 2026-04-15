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

# Detach any leftover DMG staging volume from a previous failed run.
# bundle_dmg.sh leaves /Volumes/promptclip mounted when it fails mid-way,
# which blocks the next build with "Resource busy".
if mount | grep -q "/Volumes/promptclip"; then
  echo "release: detaching stale /Volumes/promptclip"
  hdiutil detach /Volumes/promptclip -force >/dev/null 2>&1 || true
fi
rm -f "$ROOT/src-tauri/target/release/bundle/macos/rw.promptclip_"*.dmg 2>/dev/null || true

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
# Notarize and staple the DMG itself.
#
# Tauri 1.x only notarizes the inner .app, not the .dmg envelope. Without
# stapling the DMG, Gatekeeper on the downloader's Mac will refuse to open
# it the first time with "unnotarized Developer ID". We fix that here:
# submit the DMG to Apple, wait for Accepted, then staple the ticket so
# offline Gatekeeper checks succeed.
# ---------------------------------------------------------------------------
if [[ "$SIGN_MODE" == "signed+notarized" ]]; then
  echo "release: notarizing DMG (can take 1-5 min)"
  if [[ -n "${APPLE_API_KEY_PATH:-}" && -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_ISSUER:-}" ]]; then
    xcrun notarytool submit "$OUT" \
      --key "$APPLE_API_KEY_PATH" \
      --key-id "$APPLE_API_KEY" \
      --issuer "$APPLE_API_ISSUER" \
      --wait
  else
    xcrun notarytool submit "$OUT" \
      --apple-id "$APPLE_ID" \
      --password "$APPLE_PASSWORD" \
      --team-id "$APPLE_TEAM_ID" \
      --wait
  fi

  echo "release: stapling notarization ticket to DMG"
  xcrun stapler staple "$OUT"
fi

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
    echo "release: Gatekeeper rejected the DMG" >&2
    exit 1
  fi

  if [[ "$SIGN_MODE" == "signed+notarized" ]]; then
    echo "release: validating notarization staple on DMG"
    xcrun stapler validate "$OUT" || {
      echo "release: stapler validate FAILED" >&2
      exit 1
    }
  fi
fi


# ---------------------------------------------------------------------------
# Final step: commit everything and push.
# Stages all changes (version bumps, README link, rebuilt DMG, etc.) under a
# single "Release {version}" commit, then pushes to the current branch's
# upstream. Runs only if this is a git repo.
# ---------------------------------------------------------------------------
if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "release: committing and pushing Release $NEW"
  git -C "$ROOT" add -A
  if git -C "$ROOT" diff --cached --quiet; then
    echo "release: nothing to commit"
  else
    git -C "$ROOT" commit -m "Release $NEW"
  fi
  BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)
  if git -C "$ROOT" rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
    git -C "$ROOT" push origin "$BRANCH"
  else
    git -C "$ROOT" push -u origin "$BRANCH"
  fi
fi

echo "release: done ($SIGN_MODE)"
