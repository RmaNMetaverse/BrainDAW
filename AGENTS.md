# AGENTS.md — NeuroScape Studio Engineering Contract

> **Project:** NeuroScape Studio — Single-Window Cross-Platform Brainwave Entrainment, Hybrid Field-Recording Nature Soundscape, and Generative Synth Pad Studio.
> **Target Platforms:** Web (PWA), Windows & macOS (Tauri v2), Android & iOS (Capacitor 6+).
> **How to use this pack:** Place `AGENTS.md` at the repository root and place `01-dsp-audio-engine.md`, `02-data-models-and-ui-spec.md`, and `03-platform-packaging-and-roadmap.md` inside `docs/` (or at the repository root). Read the relevant spec file before writing any code for that subsystem.

---

## 1. Specification Index

1. **`docs/01-dsp-audio-engine.md`** — Complete Web Audio API + `AudioWorklet` DSP graph, math formulas, Brainwave Engine, 5-Layer Hybrid Field-Recording Nature Engine (`SeamlessLooper`, `BioAcousticScheduler`, `GranularCloudWorklet`, Opus Biome Packs, procedural fallback), and Generative Synth Pad Engine.
2. **`docs/02-data-models-and-ui-spec.md`** — Single-source-of-truth TypeScript types (`src/types/audio.ts`), Zustand store design, curated factory presets, dark glassmorphism design tokens, tactile control specs (`Fader`, `RotaryKnob`, `XYPad`, `VisualizerCanvas`), and single-window adaptive layouts (Desktop / Tablet / Mobile).
3. **`docs/03-platform-packaging-and-roadmap.md`** — Platform abstraction (`platformBridge`, `backgroundAudio`, `fileExport`), Tauri v2 desktop config, Capacitor iOS/Android background audio config, PWA offline caching, and the **5-Phase Implementation Roadmap** with per-phase verification checklists.

---

## 2. Core Tech Stack (Do Not Substitute)

- **Core App:** React 19 + TypeScript (strict mode) + Vite 6
- **Styling:** Tailwind CSS v4 (dark-mode-first, glassmorphism tokens)
- **State:** Zustand v5 (with transient `subscribe` for zero-rerender audio updates)
- **Audio DSP:** Native Web Audio API + custom `AudioWorkletProcessor` scripts (NO `ScriptProcessorNode`, NO Tone.js bloat unless strictly justified—native Web Audio gives exact phase control for binaural beats and custom worklets)
- **Persistence:** IndexedDB via `idb` (presets + Opus Biome Pack caching) + JSON import/export
- **Desktop Wrapper:** Tauri v2 (Rust shell, Windows `.msi`/`.exe` & macOS `.dmg`/`.app`)
- **Mobile Wrapper:** Capacitor 6+ (iOS `AVAudioSession` background audio + Android `ForegroundService`)

---

## 3. Non-Negotiable Engineering Guardrails

1. **Strict Audio/UI Isolation:** `src/audio/` MUST contain **zero React imports**. The UI talks to the audio engine only via Zustand transient subscribers or `AudioEngineManager` controller methods.
2. **Zero Audio Clicks / Zipper Noise:** NEVER assign `.value = x` directly to a running `AudioParam`. Always use `smoothParam(param, value, ctx.currentTime, 0.04)` (`setTargetAtTime`).
3. **Off-Main-Thread DSP:** All procedural noise generation, granular texture clouds, and shimmer reverb DSP MUST run in `public/worklets/*.worklet.js` (`AudioWorkletProcessor`). Never use deprecated `ScriptProcessorNode`.
4. **Field-Recording First, Procedural Fallback Always:** `NatureEngine` prioritizes decoded `.opus` field recordings loaded via `BiomePackLoader`. If a biome pack is missing, offline, or still decoding, it MUST seamlessly fall back to `noise-generator.worklet.js` procedural rain/wind/thunder so the app boots with rich audio and zero errors on day 1.
5. **Preserve Binaural Phase Integrity:** Keep `BrainwaveEngine` Left and Right channels strictly isolated via `ChannelMergerNode(2)` until the Master Bus. Never collapse the Brainwave bus to mono or route it through chorus/reverb by default.
6. **8-Hour Overnight Memory Hygiene:** Every one-shot `AudioBufferSourceNode` and its per-event `BiquadFilterNode`, `StereoPannerNode`, and `GainNode` MUST be explicitly disconnected in `onended` to guarantee zero memory leaks during overnight sleep sessions.
7. **Single-Window Contract:** All three engines (Brainwave, Nature, Synth Pad) and Master Transport MUST be controllable inside one window/tab—never require multiple tabs or separate windows.
8. **Battery-Aware Rendering:** `VisualizerCanvas` MUST pause its `requestAnimationFrame` loop when `document.hidden === true` while keeping `AudioContext` running uninterrupted.

---

## 4. Target Repository Structure

```text
neuroscape-studio/
├── AGENTS.md
├── docs/
│   ├── 01-dsp-audio-engine.md
│   ├── 02-data-models-and-ui-spec.md
│   └── 03-platform-packaging-and-roadmap.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.webmanifest
│   ├── biomes/
│   │   └── jungle/
│   │       ├── manifest.json
│   │       ├── ir_rainforest.opus
│   │       ├── beds/
│   │       └── oneshots/
│   └── worklets/
│       ├── noise-generator.worklet.js
│       ├── granular-cloud.worklet.js
│       └── shimmer-reverb.worklet.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/audio.ts
│   ├── store/
│   │   ├── useAudioStore.ts
│   │   └── factoryPresets.ts
│   ├── audio/
│   │   ├── AudioEngineManager.ts
│   │   ├── BrainwaveEngine.ts
│   │   ├── NatureEngine.ts
│   │   ├── BiomePackLoader.ts
│   │   ├── SeamlessLooper.ts
│   │   ├── BioAcousticScheduler.ts
│   │   ├── SynthPadEngine.ts
│   │   └── utils/
│   │       ├── smoothing.ts
│   │       └── musicTheory.ts
│   ├── platform/
│   │   ├── platformBridge.ts
│   │   ├── backgroundAudio.ts
│   │   └── fileExport.ts
│   └── components/
│       ├── layout/
│       │   ├── StudioShell.tsx
│       │   └── MasterTransport.tsx
│       ├── controls/
│       │   ├── Fader.tsx
│       │   ├── RotaryKnob.tsx
│       │   ├── XYPad.tsx
│       │   └── VisualizerCanvas.tsx
│       ├── channels/
│       │   ├── BrainwavePanel.tsx
│       │   ├── NaturePanel.tsx
│       │   └── SynthPadPanel.tsx
│       └── modals/
│           └── PresetManagerModal.tsx
├── src-tauri/                       # Phase 4 (Windows & macOS)
└── mobile/                          # Phase 5 (iOS & Android via Capacitor)
```

---

## 5. Agent Workflow & Verification Commands

Execute phases sequentially from `docs/03-platform-packaging-and-roadmap.md`. At the end of EVERY phase, run and verify:

```bash
npm run typecheck   # tsc --noEmit (must pass with 0 errors)
npm run build       # vite build (must pass with 0 bundle/worklet path errors)
npm run test        # vitest run (unit tests for math, musicTheory, shuffleBag, smoothing)
```

Do not mark a phase complete until all commands pass cleanly and the app boots with live audio on first user click.
