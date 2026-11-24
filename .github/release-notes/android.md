# BrainDAW Android

BrainDAW now mixes with other Android audio by leaving audio focus with the music app. Recorded nature beds loop continuously in the audio graph, and ambience events and pad changes are scheduled ahead to reduce gaps while switching apps.

- `BrainDAW-Android.apk` is the signed APK for direct installation. Starting with v0.2.3, GitHub builds use a permanent signing key and support in-place updates.
- `BrainDAW-Android-unsigned.aab` is the App Bundle for signing with a Google Play upload key.

Switching from the old `BrainDAW-Android-debug.apk` requires a one-time reinstall because the signing certificate changed. Before uninstalling, export saved mixes using **Presets → Export current** and export custom biomes using **Nature → Export biome**. Keep those files outside the app and import them after installing the signed APK. If a restored preset uses a custom biome, reselect the imported biome and save the mix again.

GitHub Actions verifies the signing certificate, installation over the previous release, and background audio while a separate app plays and holds audio focus on the emulator.
