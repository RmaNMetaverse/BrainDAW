# 01 — Real-Time DSP Audio Engine Specification

> **Scope:** Complete audio graph, mathematical specifications, `AudioWorklet` designs, and TypeScript module contracts for `src/audio/` and `public/worklets/`.
> **Rule:** Zero React imports anywhere in `src/audio/`.

---

## 1. Master Audio Graph (`src/audio/AudioEngineManager.ts`)

All three engines share a single `AudioContext` (`latencyHint: 'playback'` for stability and low CPU during multi-hour sessions).

The Android wrapper requests 180 ms of buffering to give the audio renderer headroom during system UI activity. The visualizer stops drawing when a system overlay takes window focus and resumes when focus returns. The device and WebView determine the actual buffer size.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        MASTER AUDIO GRAPH                               │
│                                                                         │
│  [1. BRAINWAVE BUS] ──► bwGain (Stereo Isolated) ────┐                  │
│     • Left Osc (f_c - f_b/2) -> Merger(0)            │                  │
│     • Right Osc (f_c + f_b/2) -> Merger(1)           │                  │
│     • Isochronic AM LFO + Breathing Swell LFO        │                  │
│     • Anti-Habituation Drift LFO + Session Ramp      │                  │
│                                                      ├──► masterPreGain │
│  [2. HYBRID NATURE BUS] ──► natureGain ──────────────┤    │             │
│     • Tiered Field-Recording Beds (Prime Lengths)    │    ▼             │
│     • Native Equal-Power SeamlessLooper              │  masterLimiter   │
│     • Granular Cloud Worklet (surrealDepth)          │  (DynamicsComp)  │
│     • Stochastic 3D BioAcousticScheduler             │    │             │
│     • Outdoor ConvolverNode + Shimmer Send           │    ▼             │
│     • Procedural Noise Worklet (Automatic Fallback)  │  sleepFadeGain   │
│                                                      │    │             │
│  [3. SYNTH PAD BUS] ──────► padGain ─────────────────┘    ▼             │
│     • 4–6 Polyphonic Detuned Voices + Sub Osc           analyserNode    │
│     • Cascaded 24dB/oct LPF + Slow Filter LFO             │             │
│     • Consonant Voice-Leading Chord Morpher               ▼             │
│     • Stereo Chorus + Shimmer Reverb Worklet            destination     │
└─────────────────────────────────────────────────────────────────────────┘
```

### AudioParam Smoothing Utility (`src/audio/utils/smoothing.ts`)
Never set `.value` directly on a running `AudioParam`. Use:

```typescript
export function smoothParam(
  param: AudioParam,
  target: number,
  now: number,
  timeConstant = 0.04
): void {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(target, now, timeConstant);
}

export function equalPowerCrossfade(t: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.cos(clamped * Math.PI * 0.5),
    Math.sin(clamped * Math.PI * 0.5),
  ];
}
```

### Master Bus Dynamics & Sleep Timer
- **Soft Limiter (`DynamicsCompressorNode`):** `threshold: -2`, `knee: 6`, `ratio: 12`, `attack: 0.003`, `release: 0.15` to guarantee zero clipping when all 3 engines peak simultaneously.
- **Play/Pause Fade:** Always ramp `masterPreGain` over `0.35s` on Play/Pause to avoid pops.
- **Sleep Timer Fade-Out:** When sleep timer reaches `fadeOutSec` remaining, schedule `sleepFadeGain.gain.linearRampToValueAtTime(0.0001, now + fadeOutSec)`, then suspend `AudioContext` on completion to save battery.

---

## 2. Engine 1: Brainwave Entrainment (`src/audio/BrainwaveEngine.ts`)

### Synthesis Modes
1. **`binaural` (Headphones Required):**
   - Two pure `OscillatorNode`s (`type: 'sine'`), routed strictly to `ChannelMergerNode(2)`:
     - Left channel (`input 0`): $f_L = f_c - \frac{f_b}{2}$
     - Right channel (`input 1`): $f_R = f_c + \frac{f_b}{2}$
   - Never apply reverb or stereo-widening to this raw path; phase coherence is essential.
2. **`isochronic` (Works on Speakers or Headphones):**
   - Both channels share carrier $f_c$, amplitude-modulated by an LFO at frequency $f_b$ shaped into a smooth raised-cosine pulse (gain oscillates between `1 - isochronicDepth` and `1.0`).
3. **`monaural`:**
   - Sum $f_L$ and $f_R$ equally into both Left and Right channels before output so the physical acoustic beat occurs in air.
4. **`hybrid`:**
   - Full binaural split ($f_L, f_R$) **plus** subtle isochronic AM pulse (`isochronicDepth` scaled to `0–0.5`).

### Brainwave State Presets
| Preset ID | Range | Default Beat ($f_b$) | Default Carrier ($f_c$) | Intended State |
| :--- | :--- | :--- | :--- | :--- |
| `delta` | `0.5–4.0 Hz` | `2.0 Hz` | `110 Hz` | Deep sleep, physical restoration |
| `theta` | `4.0–8.0 Hz` | `6.0 Hz` | `144 Hz` | Deep meditation, lucid dreaming, creativity |
| `alpha` | `8.0–12.0 Hz` | `10.0 Hz` | `180 Hz` | Relaxed focus, calm flow |
| `smr` | `12.0–15.0 Hz` | `14.0 Hz` | `200 Hz` | Calm alertness, sensorimotor rhythm |
| `beta` | `15.0–30.0 Hz` | `20.0 Hz` | `220 Hz` | Active analytical work |
| `gamma` | `30.0–45.0 Hz` | `40.0 Hz` | `256 Hz` | Peak cognition, insight |

### Modulation & Session Timeline
- **Rhythmic Breathing Swell LFO:** Slow sine LFO (`rhythmModHz`: `0.05–0.5 Hz`, default `0.1 Hz` = 10-second breathing cycle) modulating a dedicated `swellGain` node by `±(rhythmModDepth * 0.35)`.
- **Anti-Habituation Frequency Drift:** Ultra-slow sine LFO (`0.016 Hz` = 60s period) gently modulating $f_b$ by `±(frequencyDriftDepth * 0.45 Hz)` so the auditory cortex does not tune out the entrainment tone.
- **Warmth Low-Pass Filter:** Gentle `BiquadFilterNode` (`lowpass`, `Q: 0.7`, `warmthFilterHz: 300–4000 Hz`) on the post-merger stereo pair to soften upper harmonics if non-sine waveforms are ever enabled.
- **Multi-Stage Session Ramp (`SessionStage[]`):**
  - Accepts an ordered array of stages `{ durationSec, targetBeatHz, targetCarrierHz }`.
  - Uses `linearRampToValueAtTime` on Left/Right oscillator frequencies across each stage duration, updating UI progress at `1 Hz` via store callback.

---

## 3. Engine 2: 5-Layer Hybrid Field-Recording Nature Engine (`src/audio/NatureEngine.ts`)

Pure synthesis cannot replicate real rain hitting jungle leaves, authentic thunder cracks, or nocturnal wildlife. Conversely, static `.mp3` loops cause listener fatigue and cannot be parameterized. This engine uses a **5-layer AAA game-audio architecture**:

### Layer A: Stem-Separated, Intensity-Tiered Real Field Recordings (`BiomePackLoader.ts`)
Each biome is defined by a `BiomePackManifest` (`public/biomes/<biomeId>/manifest.json`) with stereo `.opus` assets (`96–128 kbps`, ~4–7 MB per full biome pack):
- **3-Tier Rain Crossfade (`rainIntensity` `0.0 -> 1.0`):**
  - `0.0 -> 0.5`: Equal-power crossfade between `rainTiers[0]` (drizzle on foliage) and `rainTiers[1]` (steady rain).
  - `0.5 -> 1.0`: Equal-power crossfade between `rainTiers[1]` (steady rain) and `rainTiers[2]` (heavy tropical downpour).
  - Below `0.05`: Smoothly fade `rainTiers[0]` to silence.
- **2-Tier Wind Crossfade (`windGustiness` `0.0 -> 1.0`):** Crossfades `windTiers[0]` (gentle breeze) into `windTiers[1]` (gusting canopy wind) with a slow random-walk gain/filter modulation so gusts swell organically.
- **Independent Continuous Stems:** `insectBed` (cicadas/crickets), `waterFlow` (creek/surf), and `ambientAir` (forest room tone).

### Layer B: Continuous recording beds (`SeamlessLooper.ts`)

Each bed starts at a randomized interior offset and loops directly in Web Audio. At load time, blend the final $C = \min(5.0, D \times 0.25)$ seconds into the first $C$ seconds using equal-power fade-out and fade-in curves. Set the native loop start immediately after the head segment used in the blend. At the wrap, playback continues with the next sample of that head segment. Different effective loop lengths and independently randomized starting offsets keep the beds out of phase.

The continuous beds can wrap while the WebView main thread is busy. Copy a shared buffer before preparing its seam when it also serves as a one-shot or impulse response. Stop and disconnect each source when changing scenes.

Nature can run up to four stereo voices through independent gain nodes. The XY shares are `(1−x)y`, `xy`, `(1−x)(1−y)`, and `x(1−y)`, ordered top-left, top-right, bottom-left, bottom-right. Each voice has its own source settings. The fireside voice generates its ember bed and wood crackle in the noise worklet, with adjustable warmth and crackle density.

### Layer C: Stochastic 3D Bio-Acoustic Event Scheduler (`BioAcousticScheduler.ts`)
Handles discrete field-recorded one-shots: `thunder[]`, `wildlife[]` (birds, frogs, nocturnal calls), and `accents[]` (heavy water drops, leaf rustles).
- **Lookahead Loop:** A render-thread clock wakes the scheduler about once per audio second. It queues Web Audio nodes up to eight seconds ahead using `ctx.currentTime`. Changes to event controls clear pending events so new settings can take effect.
- **Poisson Arrival Rate:** For each category with user density slider $p \in [0, 1]$:
  - If $p < 0.02$, skip scheduling.
  - Mean interval $\mu(p) = \text{lerp}(\mu_{\max}, \mu_{\min}, p^2)$ (e.g., wildlife: `35s` at low density down to `2.5s` at max density; thunder: `90s` down to `12s`).
  - Next inter-arrival delay $\Delta t = -\mu \ln(1 - U)$ where $U \sim \text{Uniform}(0, 0.999)$.
- **Anti-Repetition Shuffle Bag:** Pull samples from a Fisher-Yates shuffled bag; when exhausted, reshuffle while ensuring the first item of the new bag $\neq$ last item of the previous bag.
- **Per-Event Realism Chain (Disconnected in `onended`):**
  1. `AudioBufferSourceNode` with micro-pitch variance: `playbackRate = 1 + (Math.random() * 2 - 1) * 0.06` (`±6%`).
  2. Distance $d \in [0.05, 1.0]$ (for thunder, biased around `thunderDistance ± 0.25`).
  3. **Air-Absorption LPF (`BiquadFilterNode`):** `cutoff = 18000 * Math.pow(0.04, d)` (ranges from `~15 kHz` close up to `~720 Hz` far away).
  4. **3D Stereo Placement (`StereoPannerNode`):** Random pan $\in [-0.85, +0.85] \times \text{stereoWidth}$.
  5. **Dry/Wet Split:**
     - Dry Gain: `1.0 - 0.65 * d` -> Nature Bus
     - Outdoor Reverb Send: `(0.15 + 0.75 * d) * reverbSpace` -> `ConvolverNode` (loaded with biome's `ir_rainforest.opus` or synthesized exponential outdoor IR)
     - Surreal Shimmer Send: `(surrealDepth > 0.2 ? (surrealDepth - 0.2) * 0.9 : 0)` -> Shimmer Reverb Bus

### Layer D: Granular Texture Cloud & `surrealDepth` (`public/worklets/granular-cloud.worklet.js`)
Transforms authentic field recordings seamlessly from **documentary realism (`surrealDepth = 0`)** to **dreamlike, non-looping surrealism (`surrealDepth = 1`)**:
- **Buffer Transfer:** When a biome loads, transfer a mono/stereo `Float32Array` copy of the primary ambient/rain bed to the `AudioWorkletNode` via `port.postMessage({ type: 'LOAD_BUFFER', channels })`.
- **Asynchronous Grain Engine (Inside `process()`):**
  - Maintain a fixed pool of `16` concurrent grains (zero allocations in `process()`).
  - Spawn rate scales with `surrealDepth` (`2–14 grains/sec`).
  - Each grain selects a random read position in the field-recording buffer, duration `180ms–750ms`, subtle pitch ratio (`0.92–1.08`, with occasional `0.5x` or `2.0x` octave ghost grains when `surrealDepth > 0.6`), random stereo pan, and a **Hann window** envelope:
    $$w(n) = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N - 1}\right)\right)$$
  - Route the granular cloud output into the Shimmer Reverb send so real nature textures bloom into infinite, lush halos that merge seamlessly with the Synth Pad Engine.

### Layer E: Zero-Asset Procedural Fallback (`public/worklets/noise-generator.worklet.js`)
If `BiomePackLoader` finds no `.opus` files (e.g., during Phase 1 or offline without cached packs), `NatureEngine` automatically activates the procedural fallback:
- **Paul Kellet Pink Noise + Leaky Integrator Brown Noise** computed sample-by-sample in `AudioWorkletProcessor`.
- Routed through modulated bandpass/lowpass filters to synthesize Rain (Pink noise + `1.2–4 kHz` shelf), Wind (Brown/Pink + slow LFO resonant bandpass `180–650 Hz`), and Procedural Thunder (burst of Brown noise shaped by a `3–6s` exponential decay envelope + `140 Hz` low-pass).
- As soon as a real Biome Pack finishes decoding, crossfade smoothly (`1.5s`) from the fallback into the real field recordings.

---

## 4. Engine 3: Generative Modulating Synth Pad (`src/audio/SynthPadEngine.ts`)

### Music Theory & Voice-Leading (`src/audio/utils/musicTheory.ts`)
- **Tuning Formula:**
  $$f(\text{midi}) = f_{\text{A4}} \cdot 2^{\frac{\text{midi} - 69}{12}}, \quad f_{\text{A4}} \in \{440, 432\}$$
- **Scale Intervals (semitones from `rootNote`):**
  - `lydian`: `[0, 2, 4, 6, 7, 9, 11, 14]` (dreamy, uplifting, sci-fi)
  - `dorian`: `[0, 2, 3, 5, 7, 9, 10, 14]` (warm, contemplative)
  - `minor_pentatonic`: `[0, 3, 5, 7, 10, 12, 15]` (safe, never dissonant)
  - `sus2_drone`: `[0, 2, 7, 12, 14, 19]` (pure meditative stasis)
  - `aeolian`: `[0, 2, 3, 5, 7, 8, 10, 12]` (deep emotional ambient)

### Polyphonic Voice Architecture (5 Voices)
- Each voice consists of:
  - `oscA` + `oscB` (detuned by `-detuneCents` and `+detuneCents`, waveform selectable: `sine`, `triangle`, `warm_saw` via custom band-limited `PeriodicWave`, or `glass_pad` harmonic partials `[0, 1, 0.35, 0.15, 0.08, 0.04]`).
  - Optional `subOsc` (`sine`, `-12 semitones` on Voice 0 only, gain `0.25`).
  - Per-voice `StereoPannerNode` spread across `[-0.65, -0.3, 0, +0.3, +0.65]`.
  - Per-voice `GainNode` for long-envelope crossfades (`attack: 5s`, `release: 8s`).
- **Continuous Harmonic Morphing (`evolutionSpeed`):**
  - Every `T = lerp(36, 10, evolutionSpeed)` seconds, pick 1 non-root voice, fade it down over `6s`, glide/re-spawn it on a neighboring consonant scale degree (avoiding minor-second clusters), and fade it back in over `6s`. This creates an **endless, non-repeating pad** with zero chord-jump seams.

### Pad Filter & Spatial FX Chain
1. **Cascaded 24dB/oct Warm Low-Pass Filter:** Two `BiquadFilterNode`s in series (`type: 'lowpass'`, `Q: 0.85`).
2. **Slow Filter LFO:** Sine LFO (`filterLfoRateHz: 0.01–0.3 Hz`) modulating both filter cutoffs by `±(filterLfoDepth * filterCutoffHz * 0.65)`.
3. **Stereo Ensemble Chorus:** Dual short `DelayNode`s (`18ms` and `24ms`) modulated out-of-phase by a `0.18 Hz` LFO (`±2.5ms` depth), panned Left/Right.
4. **Shimmer Reverb (`public/worklets/shimmer-reverb.worklet.js` or FDN + ConvolverNode):**
   - Long lush stereo reverb (`reverbDecaySec: 2–16s`) with high-frequency damping at `4.5 kHz`.
   - When `shimmerAmount > 0`, feed a fraction of the reverb tank through a dual-tap pitch-shifter (`+12 semitones`) back into the reverb input, capped carefully (`feedback <= 0.45`) so it never self-oscillates or runs away.
