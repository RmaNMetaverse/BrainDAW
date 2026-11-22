# 03 — Cross-Platform Packaging, Background Audio & 5-Phase Roadmap

> **Scope:** Platform abstraction layer (`src/platform/`), Desktop packaging (Tauri v2 for Windows & macOS), Mobile packaging (Capacitor 6+ for iOS & Android with native background audio), PWA offline caching, and the sequential 5-phase build plan for AI coding agents.

---

## 1. Platform Abstraction Layer (`src/platform/`)

Keep all platform-specific branches isolated inside `src/platform/` so UI and DSP code remain 100% platform-agnostic.

### `src/platform/platformBridge.ts`
Detects runtime environment cleanly:
```typescript
export type RuntimePlatform = 'web' | 'tauri-windows' | 'tauri-macos' | 'capacitor-ios' | 'capacitor-android';

export function detectPlatform(): RuntimePlatform {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return navigator.userAgent.includes('Mac') ? 'tauri-macos' : 'tauri-windows';
  }
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  if (cap?.getPlatform) {
    const p = cap.getPlatform();
    if (p === 'ios') return 'capacitor-ios';
    if (p === 'android') return 'capacitor-android';
  }
  return 'web';
}
```

### `src/platform/backgroundAudio.ts`
Handles lock-screen controls and continuous playback:
- **Web / PWA:** Register `navigator.mediaSession` metadata (Preset Title, "NeuroScape Studio", artwork) and `play` / `pause` / `stop` action handlers.
- **iOS (Capacitor):** Activate native `AVAudioSession` in `.playback` category (with optional `.mixWithOthers` toggle in settings) and maintain a silent/media background audio session so `WKWebView` does not suspend `AudioContext` when the screen locks.
- **Android (Capacitor):** Start an Android `ForegroundService` (`FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK`) with a persistent lock-screen MediaStyle notification displaying the active preset, Sleep Timer countdown, and Play/Pause button.

### `src/platform/fileExport.ts`
Unified preset & custom Biome Pack JSON/audio import/export:
- **Web / PWA:** Standard Blob download + `<input type="file">` / File System Access API.
- **Tauri v2:** Uses `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` for native OS save/open dialogs.
- **Capacitor:** Uses `@capacitor/filesystem` + `@capacitor/share` for mobile share sheet export.

---

## 2. Desktop Packaging Specification (Windows & macOS — Tauri v2)

- **Window Configuration (`src-tauri/tauri.conf.json`):**
  - Default size: `1280x800`, minimum size: `1024x680`.
  - Dark background color `#070A10` set natively on window creation (zero white flash on boot).
  - macOS: `titleBarStyle: "Overlay"` with subtle vibrancy; Windows: dark titlebar / Mica styling.
- **System Tray:** Optional minimize-to-tray with quick menu items: `Play / Pause`, `Mute Master`, `Active Preset`, `Quit`.
- **Audio Autoplay:** Tauri WebViews allow seamless `AudioContext` startup on first click; persist last-used preset in IndexedDB.

---

## 3. Mobile Packaging Specification (iOS & Android — Capacitor 6+)

- **iOS (`mobile/ios/App/App/Info.plist`):**
  - Add `<key>UIBackgroundModes</key><array><string>audio</string></array>`.
  - Configure `AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)` in `AppDelegate.swift` and handle audio interruption notifications (phone calls / alarms) by smoothly fading out and resuming cleanly.
- **Android (`mobile/android/app/src/main/AndroidManifest.xml`):**
  - Declare `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `WAKE_LOCK` permissions.
  - Register a sticky media playback `ForegroundService` synced with `useAudioStore.isPlaying`.
- **Haptics:** Trigger light haptic ticks (`@capacitor/haptics` `ImpactStyle.Light`) when switching Brainwave presets or toggling channels on mobile.

---

## 4. Sequential 5-Phase Execution Plan (For Coding Agents)

**Strict Rule:** Complete and verify each phase (`npm run typecheck && npm run build && npm run test`) before starting the next phase.

### Phase 1: Core DSP Engine & Single-Window Web MVP
- [ ] Scaffold Vite + React 19 + TypeScript (strict) + Tailwind CSS v4 + Zustand v5 + Vitest.
- [ ] Create `src/types/audio.ts`, `src/audio/utils/smoothing.ts`, and `src/audio/utils/musicTheory.ts` (+ unit tests).
- [ ] Implement `AudioEngineManager.ts` (singleton `AudioContext`, master limiter, `AnalyserNode`, click-free Play/Pause fade).
- [ ] Implement `BrainwaveEngine.ts` (Binaural, Isochronic, Monaural, Hybrid modes + 6 presets + breathing swell LFO + anti-habituation drift).
- [ ] Implement `public/worklets/noise-generator.worklet.js` (Pink/Brown noise) and `NatureEngine.ts` v1 procedural fallback so the app produces rich rain/wind/thunder immediately without external files.
- [ ] Implement `SynthPadEngine.ts` (5 polyphonic detuned voices, 432/440Hz scales, cascaded 24dB/oct LPF + slow LFO, automatic voice-leading chord morpher, stereo chorus, algorithmic/convolver reverb).
- [ ] Build `StudioShell.tsx`, `MasterTransport.tsx`, `BrainwavePanel.tsx`, `NaturePanel.tsx`, and `SynthPadPanel.tsx` in a single-window dark glassmorphism layout.
- **Phase 1 Exit Gate:** App boots cleanly in browser; clicking Play smoothly starts all 3 engines simultaneously with zero clicks, zero console warnings, and responsive 3-column / mobile-pinned layout.

### Phase 2: 5-Layer Hybrid Field-Recording Nature Engine & Surreal Granular DSP
- [ ] Implement `BiomePackLoader.ts` with IndexedDB (`idb`) caching for `BiomePackManifest` + `.opus` decoding.
- [ ] Implement `SeamlessLooper.ts` (dual-deck `AudioBufferSourceNode` with 4–6s equal-power cosine/sine crossfade and randomized interior start offsets) + 3-tier `rainIntensity` crossfader.
- [ ] Implement `BioAcousticScheduler.ts` (Poisson lookahead scheduler, anti-repetition shuffle bag, `±6%` micro-pitch variance, distance-based air-absorption LPF, stereo panning, outdoor `ConvolverNode` reverb send, strict `onended` node cleanup).
- [ ] Implement `public/worklets/granular-cloud.worklet.js` (16-grain Hann-windowed asynchronous sampler reading real field-recording buffers) and `public/worklets/shimmer-reverb.worklet.js`, wired to `surrealDepth`.
- [ ] Add drag-and-drop custom audio file import so users can test/build custom Biome Packs directly in the browser.
- **Phase 2 Exit Gate:** Seamless crossfade between procedural fallback and real Opus biome stems; zero audible loop seams; zero memory growth over sustained scheduler runs; `surrealDepth` smoothly morphs realism into ethereal shimmer.

### Phase 3: Expressive Controls, Session Timelines, Presets & Offline PWA
- [ ] Replace basic sliders with custom `Fader.tsx`, `RotaryKnob.tsx`, `XYPad.tsx`, and battery-aware `VisualizerCanvas.tsx`.
- [ ] Implement multi-stage `SessionTimeline` editor and frequency ramp scheduler in `BrainwaveEngine.ts`.
- [ ] Implement Sleep Timer with smooth master fade-out (`30s / 60s / 120s`) and automatic `AudioContext.suspend()`.
- [ ] Implement `factoryPresets.ts` (6 curated presets), IndexedDB custom preset saving, and JSON import/export via `PresetManagerModal.tsx`.
- [ ] Configure `vite-plugin-pwa` for 100% offline web installation and `navigator.mediaSession` controls.
- **Phase 3 Exit Gate:** Full offline PWA works with network disconnected; presets save/load/export cleanly; 60fps visualizer pauses when tab is hidden.

### Phase 4: Desktop Native Packaging (Windows & macOS via Tauri v2)
- [ ] Initialize `src-tauri/` pointing to `dist/`.
- [ ] Configure dark window chrome, minimum dimensions (`1024x680`), and system tray Play/Pause/Quit controls.
- [ ] Wire `platformBridge.ts` and `fileExport.ts` to Tauri native file dialogs.
- **Phase 4 Exit Gate:** `npm run tauri build` compiles cleanly with identical single-window UI and working AudioWorklets.

### Phase 5: Mobile Native Packaging (iOS & Android via Capacitor 6+)
- [ ] Initialize Capacitor (`mobile/`) pointing to `dist/` and add `ios` and `android` platforms.
- [ ] Implement native iOS `AVAudioSession` background audio and Android `ForegroundService` media playback notification in `backgroundAudio.ts`.
- [ ] Verify mobile safe-area insets, pinned 3-channel master balance strip, touch drag on `XYPad`/`Fader`, and haptic feedback.
- **Phase 5 Exit Gate:** Audio continues playing uninterrupted when the phone screen locks, with functional lock-screen Play/Pause controls.
