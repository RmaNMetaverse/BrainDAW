# BrainDAW Android

Android requests a larger audio buffer and stops visualizer rendering while the notification shade or another app takes focus. BrainDAW still leaves audio focus with the music app.

The four-corner Nature pad mixes Fireside, Rainstorm, Ocean Coast, and Rainforest by default. Each corner has independent settings. The library adds seven pure brainwave presets and eight original restful soundscapes.

- `BrainDAW-Android.apk` is the signed APK for direct installation. Starting with v0.2.3, GitHub builds use a permanent signing key and support in-place updates.
- `BrainDAW-Android-unsigned.aab` is the App Bundle for signing with a Google Play upload key.

Switching from the old `BrainDAW-Android-debug.apk` requires a one-time reinstall because the signing certificate changed. Before uninstalling, export saved mixes using **Presets → Export current** and export custom biomes using **Nature → Export biome**. Keep those files outside the app and import them after installing the signed APK. If a restored preset uses a custom biome, reselect the imported biome and save the mix again.

GitHub Actions checks the signing certificate, in-place installation, playback under the notification shade, display-off playback, and concurrent playback with another app on an emulator.
