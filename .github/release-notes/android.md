# BrainDAW Android preview

- `BrainDAW-Android-debug.apk` can be installed for testing.
- `BrainDAW-Android-unsigned.aab` is the production build output for signing with a Play upload key.

The GitHub Actions emulator test verifies first-click audio, the media foreground service, playback with the display off, and pause through Android media controls. Physical devices still need lock-screen and battery-management testing. The debug APK uses a build-machine debug key, so an update from another key can require uninstalling the previous build.
