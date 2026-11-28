# 02 — Data Models, State Architecture & Adaptive UI/UX Specification

> **Scope:** Single-source-of-truth TypeScript schemas, Zustand store design, factory presets, visual design tokens, custom audio controls, and single-window responsive layouts across Web, Desktop, and Mobile.

---

## 1. Single Source of Truth Types (`src/types/audio.ts`)

Implement this file verbatim. Every UI control, audio engine method, and JSON preset file binds directly to these interfaces.

```typescript
export type BrainwavePresetId =
  | 'delta'
  | 'theta'
  | 'alpha'
  | 'smr'
  | 'beta'
  | 'gamma'
  | 'custom';

export type EntrainmentMode = 'binaural' | 'isochronic' | 'monaural' | 'hybrid';

export type BiomeId =
  | 'jungle'
  | 'rainstorm'
  | 'night_forest'
  | 'ocean_coast'
  | 'alpine_wind'
  | string;

export type ScaleId =
  | 'lydian'
  | 'dorian'
  | 'minor_pentatonic'
  | 'sus2_drone'
  | 'aeolian';

export type PadWaveform = 'sine' | 'triangle' | 'warm_saw' | 'glass_pad';

export interface BrainwaveParams {
  enabled: boolean;
  volume: number;              // 0.0 to 1.0
  preset: BrainwavePresetId;
  mode: EntrainmentMode;
  carrierHz: number;           // 60 to 500 Hz
  beatHz: number;              // 0.5 to 45 Hz
  isochronicDepth: number;     // 0.0 to 1.0
  rhythmModHz: number;         // 0.0 to 0.5 Hz (breathing/swell LFO)
  rhythmModDepth: number;      // 0.0 to 1.0
  frequencyDriftDepth: number; // 0.0 to 1.0 (anti-habituation drift)
  warmthFilterHz: number;      // 300 to 4000 Hz
}

export interface NatureSoundParams {
  biome: BiomeId;
  rainIntensity: number;       // 0.0 to 1.0 (crossfades 3 real rain tiers)
  thunderProbability: number;  // 0.0 to 1.0 (Poisson arrival rate)
  thunderDistance: number;     // 0.0 to 1.0 (0 = close crack, 1 = distant roll)
  windGustiness: number;       // 0.0 to 1.0
  wildlifeDensity: number;     // 0.0 to 1.0 (birds, frogs, nocturnal calls)
  insectBed: number;           // 0.0 to 1.0 (cicadas/crickets continuous stem)
  waterFlow: number;           // 0.0 to 1.0 (stream/surf continuous stem)
  stereoWidth: number;         // 0.0 to 1.0
  reverbSpace: number;         // 0.0 to 1.0 (outdoor convolution IR wetness)
  surrealDepth: number;        // 0.0 to 1.0 (granular cloud + shimmer dissolve)
  fireCrackle?: number;
  fireWarmth?: number;
}

export interface NatureBlend {
  x: number;
  y: number;
  corners: [NatureSoundParams, NatureSoundParams, NatureSoundParams, NatureSoundParams];
}

export interface NatureParams extends NatureSoundParams {
  enabled: boolean;
  volume: number;
  blend?: NatureBlend;
}

export interface SynthPadParams {
  enabled: boolean;
  volume: number;              // 0.0 to 1.0
  rootNote: number;            // MIDI note (e.g., 48 = C3, 45 = A2)
  tuningHz: 440 | 432;
  scale: ScaleId;
  waveform: PadWaveform;
  detuneCents: number;         // 0 to 25
  filterCutoffHz: number;      // 200 to 6000 Hz
  filterLfoRateHz: number;     // 0.01 to 0.3 Hz
  filterLfoDepth: number;      // 0.0 to 1.0
  evolutionSpeed: number;      // 0.0 to 1.0 (chord morph rate)
  shimmerAmount: number;       // 0.0 to 1.0
  reverbDecaySec: number;      // 2.0 to 16.0
}

export interface SessionStage {
  id: string;
  label: string;
  durationSec: number;
  targetBeatHz: number;
  targetCarrierHz: number;
}

export interface NeuroScapePreset {
  id: string;
  name: string;
  description?: string;
  category?: 'sleep' | 'meditation' | 'focus' | 'lucid' | 'psychedelic' | 'custom';
  createdAt: string;
  masterVolume: number;
  sleepTimerMin: number | null; // null = infinite
  fadeOutSec: number;
  brainwave: BrainwaveParams;
  nature: NatureParams;
  synthPad: SynthPadParams;
  timeline?: SessionStage[];
}

export interface BiomePackManifest {
  id: BiomeId;
  name: string;
  version: string;
  impulseResponseUrl?: string;
  beds: {
    rainTiers?: [string, string, string];
    windTiers?: [string, string];
    insectBed?: string;
    waterFlow?: string;
    ambientAir?: string;
  };
  oneshots: {
    thunder: string[];
    wildlife: string[];
    accents?: string[];
  };
}
```

---

## 2. State Management (`src/store/useAudioStore.ts`)

Use **Zustand v5** with `subscribeWithSelector` middleware:
- **UI State:** `isPlaying`, `isMuted`, `masterVolume`, `activePresetId`, `sleepTimerRemainingSec`, `activeMobileTab` (`'brainwave' | 'nature' | 'synthPad'`), `biomeLoadingState`, `usingProceduralFallback`.
- **Engine Parameters:** `brainwave`, `nature`, `synthPad`, `timeline`.
- **Actions:**
  - `togglePlay()`, `setMasterVolume(v)`, `setSleepTimer(minutes | null)`
  - `setBrainwaveParam(key, value)`, `applyBrainwavePreset(presetId)`
  - `setNatureParam(key, value)`, `setBiome(biomeId)`
  - `setSynthPadParam(key, value)`
  - `loadPreset(preset)`, `saveCurrentAsPreset(name)`, `deleteCustomPreset(id)`
- **Audio Engine Binding:** Inside `AudioEngineManager.init()`, register transient Zustand subscribers (`useAudioStore.subscribe((s) => s.brainwave, (bw) => brainwaveEngine.update(bw))`). This keeps DSP updates instantaneous without triggering unnecessary React tree reconciliations.

---

## 3. Curated Factory Presets (`src/store/factoryPresets.ts`)

The library includes these six original presets and additional mixes for meditation, focus, dreamwork, and psychedelic-inspired sound design. The additional presets include searchable descriptions and identify beat frequencies as sound-design settings.
1. **`deep-theta-rainforest`** — *Deep Theta Rainforest*: `6.0 Hz` Theta (`144 Hz` carrier, gentle `0.1 Hz` breathing swell) + Jungle biome (`rainIntensity: 0.45`, `wildlifeDensity: 0.6`, `thunderProbability: 0.25`, `surrealDepth: 0.25`) + `432 Hz` D Dorian warm sine/glass pad.
2. **`surreal-lucid-canopy`** — *Surreal Lucid Canopy*: `5.5 Hz` Theta hybrid mode + Jungle biome (`surrealDepth: 0.78`, `wildlifeDensity: 0.55`, `reverbSpace: 0.85`) + C Lydian shimmering glass pad (`shimmerAmount: 0.7`, `evolutionSpeed: 0.55`).
3. **`delta-midnight-storm`** — *Delta Midnight Storm*: `2.0 Hz` Delta (`110 Hz` carrier) + Rainstorm (`rainIntensity: 0.85`, `thunderProbability: 0.6`, `thunderDistance: 0.7`, `surrealDepth: 0.15`) + Deep A2 Sus2 sub-warm drone (`filterCutoffHz: 550 Hz`) + `60 min` sleep timer.
4. **`alpha-flow-focus`** — *Alpha Flow State*: `10.0 Hz` Alpha (`180 Hz` carrier, slight isochronic pulse `0.25`) + Light drizzle & distant stream (`rainIntensity: 0.25`, `waterFlow: 0.5`, `surrealDepth: 0.1`) + Minimalist F Minor Pentatonic triangle pad.
5. **`gamma-neural-spark`** — *Gamma Peak Clarity*: `40.0 Hz` Gamma (`256 Hz` carrier, hybrid isochronic `0.4`) + Crisp alpine wind (`windGustiness: 0.4`, `surrealDepth: 0.2`) + Bright C Lydian glass pad (`filterCutoffHz: 2400 Hz`).
6. **`alpha-to-delta-descent`** — *Sleep Descent (Multi-Stage Ramp)*: 45-minute timeline ramping `10 Hz` Alpha (10m) → `5.5 Hz` Theta (15m) → `1.8 Hz` Delta (20m) with automatic `90s` sleep fade-out.

---

## 4. Visual Design System (Dark-Mode Glassmorphism)

### Color Palette & Tokens
- **Canvas Background:** `#070A10` with subtle, slow radial ambient mesh glow that softly shifts hue based on active engine levels.
- **Glass Panel Surface:** `rgba(17, 23, 35, 0.68)` with `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `border-radius: 16px`.
- **Elevated Control Surface:** `rgba(255, 255, 255, 0.04)` hover `rgba(255, 255, 255, 0.08)`.
- **Channel Identity Accents (Muted, Non-Fatiguing):**
  - **Brainwave Engine:** Electric Cyan (`#38BDF8`, glow `rgba(56, 189, 248, 0.22)`)
  - **Nature Engine:** Moss Emerald (`#34D399`, glow `rgba(52, 211, 153, 0.22)`)
  - **Synth Pad Engine:** Soft Violet (`#A78BFA`, glow `rgba(167, 139, 250, 0.22)`)
  - **Master / Transport:** Crisp Off-White (`#F1F5F9`)
- **Typography:** Clean geometric sans (`Inter` / system-ui) for labels; `JetBrains Mono` / `ui-monospace` with `tabular-nums` for all Hz, dB, percentage, and timer readouts so numbers never jitter when dragging sliders.

---

## 5. Custom Tactile Audio Controls (`src/components/controls/`)

All audio controls MUST feel like hardware/DAW instruments rather than default browser `<input type="range">` sliders:
1. **`Fader.tsx`:**
   - Supports vertical and horizontal orientation with pointer-capture dragging (`setPointerCapture`).
   - Displays glowing accent fill track, subtle tick marks, and tabular numeric readout.
   - `Shift + Drag` enables 10x fine-precision mode; double-click resets to default value; full keyboard arrow support (`aria-valuenow`, `role="slider"`).
2. **`RotaryKnob.tsx`:**
   - SVG arc indicator with vertical drag interaction (`150px` drag = full sweep, `Shift + Drag` = fine mode, mouse-wheel step support, double-click reset).
3. **`XYPad.tsx`:**
   - 2D interactive glass pad with glowing crosshair & radial trail for simultaneous two-axis sculpting:
     - **Nature blend pad:** Fireside, Rainstorm, Ocean Coast, and Rainforest are the default corners. The center gives each source 25% of the mix. Each corner has its own source selector and controls, including the Rain/Surreal or Rain/Wildlife pad for non-fireside corners.
     - **Synth Pad XY Pad:** X = `filterCutoffHz`, Y = `shimmerAmount`.
4. **`VisualizerCanvas.tsx`:**
   - Thin, subtle 60fps HTML5 `<canvas>` ribbon integrated into the top transport header.
   - Renders smoothed time-domain waveform from `AnalyserNode` tinted by the weighted mix of active channel colors, plus a gentle pulsing halo synced to the current Brainwave `beatHz`.
   - Strictly pauses `requestAnimationFrame` when `document.hidden === true` or `!isPlaying`.

---

## 6. Single-Window Adaptive Layouts (`src/components/layout/StudioShell.tsx`)

The exact same React components power all 5 platforms, adapting cleanly across breakpoints:

### Desktop & Web (`>= 1024px`) — 3-Column Studio Console
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [● PLAY]  [Preset Selector ▼]  [~~ Live Visualizer ~~]  [Timer] [Master]│
├───────────────────────┬─────────────────────────┬───────────────────────┤
│   1. BRAINWAVE (Cyan) │   2. NATURE (Emerald)   │  3. SYNTH PAD (Violet)│
│  [ON]  Vol Fader      │  [ON]  Vol Fader        │  [ON]  Vol Fader      │
│  Delta|Theta|Alpha... │  Biome: [Jungle ▼]      │  Key: [C3] [432Hz]    │
│  Mode: [Binaural ▼]   │  [2D XY: Rain / Surreal]│  Scale: [Lydian ▼]    │
│  Carrier Hz  Beat Hz  │  Rain Intensity         │  [2D XY: Cut / Shimm] │
│  Isochronic  Rhythm   │  Thunder Prob & Dist    │  Waveform | Detune    │
│  Freq Drift  Warmth   │  Wind Gusts             │  Filter LFO Rate/Dep  │
│  [Session Timeline]   │  Wildlife | Insects     │  Evolution Speed      │
│                       │  Water | Space | Surreal│  Reverb Decay         │
└───────────────────────┴─────────────────────────┴───────────────────────┘
```
- Keyboard shortcuts: `Space` (Play/Pause), `M` (Master Mute), `1`/`2`/`3` (Toggle channel enable).

### Tablet (`768px – 1023px`) — Pinned Mini-Mixer + 2-Column Workspace
- Top Master Transport bar + pinned horizontal 3-channel volume balance strip.
- Main area shows 2 active engine panels side-by-side with a quick toggle pill to swap the third into view.

### Mobile (`< 768px` iOS & Android) — Pinned 3-Channel Mixer + Swipeable Engine Deck
- **Always Visible (Never Hidden Across Tabs):**
  - Top bar: Play/Pause, Active Preset pill, Sleep Timer, Master Volume.
  - **Pinned 3-Channel Balance Strip:** Compact horizontal/vertical sliders + Mute/Enable dots for **Brainwave**, **Nature**, and **Synth Pad** so the user can rebalance all three engines at any second without navigating away.
- **Main Scrollable View:** Displays the deep parameters (knobs, sliders, 2D XY pad) for whichever channel pill is tapped (`Brainwave` | `Nature` | `Synth Pad`), with swipe gestures and safe-area padding (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
