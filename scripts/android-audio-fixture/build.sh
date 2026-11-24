#!/usr/bin/env bash
set -euo pipefail

fixtures=$(cd -- "$(dirname -- "$0")" && pwd)
tools="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-36/android.jar"
out="$RUNNER_TEMP/competing-audio"
mkdir -p "$out/classes"
javac --release 11 -classpath "$platform" -d "$out/classes" "$fixtures/PlaybackActivity.java"
"$tools/d8" --min-api 26 --lib "$platform" --output "$out" \
  "$out/classes/com/rmanmetaverse/audiofixture/PlaybackActivity.class"
"$tools/aapt" package -f -M "$fixtures/AndroidManifest.xml" -I "$platform" -F "$out/unsigned.apk"
(cd "$out" && "$tools/aapt" add unsigned.apk classes.dex)
"$tools/zipalign" -f 4 "$out/unsigned.apk" "$out/aligned.apk"
keytool -genkeypair -keystore "$out/fixture.p12" -storetype PKCS12 -storepass fixture \
  -alias audio-fixture -keyalg RSA -keysize 2048 -validity 2 -dname 'CN=Android audio fixture'
"$tools/apksigner" sign --ks "$out/fixture.p12" --ks-type PKCS12 --ks-key-alias audio-fixture \
  --ks-pass pass:fixture --out "$RUNNER_TEMP/competing-audio.apk" "$out/aligned.apk"
