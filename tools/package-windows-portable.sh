#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DICT_SOURCE="${1:-$ROOT/app/build/generated/nocturne/assets/dictionary}"
OUTPUT_ROOT="${2:-$ROOT/build/ci-artifacts}"
AUDIO_ASSET_SOURCE="${3:-$ROOT/app/build/generated/nocturne/audio-assets}"
READER_BUNDLE_SOURCE="${4:-$ROOT/build/reader/app.js}"

node "$ROOT/tools/build-reader.js" "$READER_BUNDLE_SOURCE"
VERSION="$(awk -F"'" '/^def nocturneVersionName = / { print $2; exit }' "$ROOT/app/build.gradle")"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.-]+)?$ ]]; then
  echo "Could not read a safe NOCTURNE version from app/build.gradle" >&2
  exit 2
fi
PACKAGE_NAME="NOCTURNE-Windows-Portable-${VERSION}"
BUILD_ORIGIN="${GITHUB_WORKFLOW:-Local build}"
BUILD_COMMIT="${GITHUB_SHA:-unknown}"
BUILD_RUN="${GITHUB_RUN_ID:-not applicable}"
if [[ "$BUILD_COMMIT" == "unknown" ]] && command -v git >/dev/null 2>&1; then
  BUILD_COMMIT="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || printf "unknown")"
fi
STAGING="$OUTPUT_ROOT/$PACKAGE_NAME"
ARCHIVE="$OUTPUT_ROOT/$PACKAGE_NAME.zip"

required=(
  cc-cedict.txt.gz
  unihan-characters.json.gz
  segmentation.txt.gz
  manifest.json
  NOTICE.txt
)
for file in "${required[@]}"; do
  if [[ ! -s "$DICT_SOURCE/$file" ]]; then
    echo "Missing or empty dictionary asset: $DICT_SOURCE/$file" >&2
    exit 2
  fi
done
if [[ ! -s "$READER_BUNDLE_SOURCE" ]]; then
  echo "Missing or empty generated reader bundle: $READER_BUNDLE_SOURCE" >&2
  exit 2
fi
for file in soundtouch-processor.js SOUNDTOUCH-LICENSE.txt; do
  if [[ ! -s "$AUDIO_ASSET_SOURCE/$file" ]]; then
    echo "Missing or empty audio-processing asset: $AUDIO_ASSET_SOURCE/$file" >&2
    exit 2
  fi
done

rm -rf "$STAGING"
mkdir -p "$STAGING/dictionary" "$OUTPUT_ROOT"
cp "$ROOT/app/src/main/assets/index.html" "$STAGING/index.html"
cp "$READER_BUNDLE_SOURCE" "$STAGING/app.js"
cp "$ROOT/app/src/main/assets/japanese-core.js" "$STAGING/japanese-core.js"
cp "$ROOT/app/src/main/assets/japanese-dictionary.js" "$STAGING/japanese-dictionary.js"
cp "$AUDIO_ASSET_SOURCE/soundtouch-processor.js" "$STAGING/soundtouch-processor.js"
cp "$AUDIO_ASSET_SOURCE/SOUNDTOUCH-LICENSE.txt" "$STAGING/SOUNDTOUCH-LICENSE.txt"
cp "$ROOT/desktop/start-nocturne.ps1" "$STAGING/start-nocturne.ps1"
cp "$ROOT/desktop/start-nocturne.bat" "$STAGING/start-nocturne.bat"
cp -R "$ROOT/samples" "$STAGING/samples"
cp "$DICT_SOURCE"/* "$STAGING/dictionary/"
cat > "$STAGING/START-HERE.txt" <<'TEXT'
NOCTURNE WINDOWS PORTABLE EDITION

1. Extract this folder to a normal writable folder on your PC.
2. Double-click start-nocturne.bat.
3. Optionally import samples/bilingual-filter-demo.srt to confirm the Chinese-only subtitle filter.
4. Keep the PowerShell console open while NOCTURNE is running.
5. Import your SRT, then select its matching audio file.

No install, Python, Node, or network service is required. The launcher serves the app locally on 127.0.0.1 only.
This portable package stores sessions and imported dictionary data in the local browser profile. It does not upload user content.
TEXT
cat > "$STAGING/BUILD-INFO.txt" <<TEXT
NOCTURNE version: $VERSION
Build origin: $BUILD_ORIGIN
Source commit: $BUILD_COMMIT
CI run ID: $BUILD_RUN
Dictionary manifest: dictionary/manifest.json
Audio processor: SoundTouchJS AudioWorklet 2.1.1 (MPL-2.0)
Runtime: local-only PowerShell loopback server + Microsoft Edge app window
TEXT
rm -f "$ARCHIVE"
(
  cd "$OUTPUT_ROOT"
  zip -qr "$(basename "$ARCHIVE")" "$PACKAGE_NAME"
)
echo "Windows portable package created: $ARCHIVE"
