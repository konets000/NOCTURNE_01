#!/usr/bin/env sh
# Offline checks: dictionary packager, cross-language contract, Android wrapper,
# reader logic, Japanese morphology adapters, and the portable Windows archive.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/tests"
rm -rf "$OUT"
mkdir -p "$OUT/classes"

echo "== 0. assemble shared reader bundle"
node "$ROOT/tools/build-reader.js" "$ROOT/build/reader/app.js"

if command -v javac >/dev/null 2>&1; then
  JAVAC="javac"
else
  JAVAC="java -m jdk.compiler/com.sun.tools.javac.Main"
fi

$JAVAC -Xlint:all -d "$OUT/classes" \
  "$ROOT/buildSrc/src/main/java/com/nocturne/build/DictionaryPackager.java" \
  "$ROOT/tests/dictionary/PackagerSelfTest.java" \
  "$ROOT/tests/dictionary/EmitFixture.java"

echo "== 1. dictionary packager self-test"
java -ea -cp "$OUT/classes" com.nocturne.build.PackagerSelfTest

echo "== 2. cross-language dictionary contract"
java -cp "$OUT/classes" com.nocturne.build.EmitFixture "$OUT/contract" >/dev/null
node "$ROOT/tests/dictionary/contract-check.cjs" "$OUT/contract/emit/out/dictionary"

echo "== 3. Android wrapper compile check"
mkdir -p "$OUT/activity"
$JAVAC -Xlint:all -d "$OUT/activity" \
  $(find "$ROOT/tests/android-stubs" -name '*.java') \
  "$ROOT/app/src/main/java/com/nocturne/app/MainActivity.java"
echo "ok - MainActivity compiles against the local Android API stubs"

echo "== 4. application smoke test"
node "$ROOT/tests/app-smoke.test.cjs"

echo "== 5. Japanese core tests"
node "$ROOT/tests/japanese-core.test.cjs"

echo "== 6. Japanese dictionary tests"
node "$ROOT/tests/japanese-dictionary.test.cjs"

if command -v zip >/dev/null 2>&1 && command -v unzip >/dev/null 2>&1; then
  echo "== 7. portable Windows package smoke test"
  PACKAGE_OUT="$OUT/windows-package"
  AUDIO_FIXTURE="$OUT/audio-assets"
  mkdir -p "$AUDIO_FIXTURE"
  printf '%s\n' '/* Synthetic test-only SoundTouch processor fixture. */' > "$AUDIO_FIXTURE/soundtouch-processor.js"
  printf '%s\n' 'Synthetic test-only licence fixture; not a distributable audio processor.' > "$AUDIO_FIXTURE/SOUNDTOUCH-LICENSE.txt"
  bash "$ROOT/tools/package-windows-portable.sh" "$OUT/contract/emit/out/dictionary" "$PACKAGE_OUT" "$AUDIO_FIXTURE" >/dev/null
  VERSION="$(awk -F"'" '/^def nocturneVersionName = / { print $2; exit }' "$ROOT/app/build.gradle")"
  if [ -z "$VERSION" ]; then
    echo "Could not determine NOCTURNE version from app/build.gradle" >&2
    exit 1
  fi
  ARCHIVE="$PACKAGE_OUT/NOCTURNE-Windows-Portable-${VERSION}.zip"
  unzip -t "$ARCHIVE" >/dev/null
  unzip -p "$ARCHIVE" "NOCTURNE-Windows-Portable-${VERSION}/app.js" | cmp - "$ROOT/build/reader/app.js"
  unzip -Z1 "$ARCHIVE" | grep -q "/start-nocturne.ps1$"
  unzip -Z1 "$ARCHIVE" | grep -q "/index.html$"
  unzip -Z1 "$ARCHIVE" | grep -q "/app.js$"
  unzip -Z1 "$ARCHIVE" | grep -q "/japanese-core.js$"
  unzip -Z1 "$ARCHIVE" | grep -q "/japanese-dictionary.js$"
  unzip -Z1 "$ARCHIVE" | grep -q "/soundtouch-processor.js$"
  unzip -Z1 "$ARCHIVE" | grep -q "/SOUNDTOUCH-LICENSE.txt$"
  unzip -Z1 "$ARCHIVE" | grep -q "/dictionary/manifest.json$"
  echo "ok - Windows archive contains the reader, Japanese modules, audio processor, licence and Chinese dictionary"
else
  echo "SKIPPED - Windows archive smoke test requires both zip and unzip; no package-test pass is claimed"
fi

echo "ALL AVAILABLE OFFLINE TESTS PASSED"
