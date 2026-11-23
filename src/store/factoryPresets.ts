import type { BrainwaveParams, BrainwavePresetId, NatureParams, NeuroScapePreset, PresetCategory, SessionStage, SynthPadParams } from '../types/audio';

export const presetCategories: Record<PresetCategory, string> = {
  meditation: 'Meditation',
  focus: 'Focus & creativity',
  sleep: 'Sleep',
  lucid: 'Dreamwork & imagery',
  psychedelic: 'Psychedelic & cannabis-inspired',
  custom: 'My presets',
};

export const brainwaveBands: Record<Exclude<BrainwavePresetId, 'custom'>, { beatHz: number; carrierHz: number; range: string }> = {
  delta: { beatHz: 2, carrierHz: 110, range: '0.5–4' },
  theta: { beatHz: 6, carrierHz: 144, range: '4–8' },
  alpha: { beatHz: 10, carrierHz: 180, range: '8–12' },
  smr: { beatHz: 14, carrierHz: 200, range: '12–15' },
  beta: { beatHz: 20, carrierHz: 220, range: '15–30' },
  gamma: { beatHz: 40, carrierHz: 256, range: '30–45' },
};

export const biomeNames: Record<string, string> = {
  jungle: 'Rainforest', rainstorm: 'Rainstorm', night_forest: 'Night Forest',
  ocean_coast: 'Ocean Coast', alpine_wind: 'Alpine Wind',
};

const brainwave: BrainwaveParams = {
  enabled: true, volume: 0.32, preset: 'theta', mode: 'binaural', carrierHz: 144,
  beatHz: 6, isochronicDepth: 0.35, rhythmModHz: 0.1, rhythmModDepth: 0.3,
  frequencyDriftDepth: 0.25, warmthFilterHz: 1600,
};

const nature: NatureParams = {
  enabled: true, volume: 0.68, biome: 'jungle', rainIntensity: 0.45, thunderProbability: 0.25,
  thunderDistance: 0.65, windGustiness: 0.22, wildlifeDensity: 0.6, insectBed: 0.25, waterFlow: 0.15,
  stereoWidth: 0.8, reverbSpace: 0.45, surrealDepth: 0.25,
};

const synthPad: SynthPadParams = {
  enabled: true, volume: 0.44, rootNote: 50, tuningHz: 432, scale: 'dorian', waveform: 'glass_pad',
  detuneCents: 8, filterCutoffHz: 1250, filterLfoRateHz: 0.055, filterLfoDepth: 0.35,
  evolutionSpeed: 0.28, shimmerAmount: 0.2, reverbDecaySec: 8,
};

function stage(id: string, label: string, minutes: number, targetBeatHz: number, targetCarrierHz: number): SessionStage {
  return { id, label, durationSec: minutes * 60, targetBeatHz, targetCarrierHz };
}

function preset(id: string, name: string, category: PresetCategory, options: {
  brainwave?: Partial<BrainwaveParams>; nature?: Partial<NatureParams>; synthPad?: Partial<SynthPadParams>;
  description?: string; timeline?: NeuroScapePreset['timeline']; sleepTimerMin?: number; fadeOutSec?: number;
} = {}): NeuroScapePreset {
  return {
    id, name, category, description: options.description, createdAt: '2025-01-01T00:00:00.000Z', masterVolume: 0.72,
    sleepTimerMin: options.sleepTimerMin ?? null, fadeOutSec: options.fadeOutSec ?? 60,
    brainwave: { ...brainwave, ...options.brainwave }, nature: { ...nature, ...options.nature },
    synthPad: { ...synthPad, ...options.synthPad }, timeline: options.timeline,
  };
}

export const factoryPresets = [
  preset('deep-theta-rainforest', 'Deep Theta Rainforest', 'meditation'),
  preset('surreal-lucid-canopy', 'Surreal Lucid Canopy', 'lucid', {
    brainwave: { beatHz: 5.5, mode: 'hybrid' },
    nature: { surrealDepth: 0.78, wildlifeDensity: 0.55, reverbSpace: 0.85 },
    synthPad: { rootNote: 48, scale: 'lydian', shimmerAmount: 0.7, evolutionSpeed: 0.55 },
  }),
  preset('delta-midnight-storm', 'Delta Midnight Storm', 'sleep', {
    brainwave: { preset: 'delta', beatHz: 2, carrierHz: 110 },
    nature: { biome: 'rainstorm', rainIntensity: 0.85, thunderProbability: 0.6, thunderDistance: 0.7, surrealDepth: 0.15 },
    synthPad: { rootNote: 45, scale: 'sus2_drone', waveform: 'sine', filterCutoffHz: 550 }, sleepTimerMin: 60,
  }),
  preset('alpha-flow-focus', 'Alpha Flow State', 'focus', {
    brainwave: { preset: 'alpha', beatHz: 10, carrierHz: 180, mode: 'hybrid', isochronicDepth: 0.25 },
    nature: { biome: 'night_forest', rainIntensity: 0.25, waterFlow: 0.5, surrealDepth: 0.1 },
    synthPad: { rootNote: 53, scale: 'minor_pentatonic', waveform: 'triangle' },
  }),
  preset('gamma-neural-spark', 'Gamma Peak Clarity', 'focus', {
    brainwave: { preset: 'gamma', beatHz: 40, carrierHz: 256, mode: 'hybrid', isochronicDepth: 0.4 },
    nature: { biome: 'alpine_wind', rainIntensity: 0.08, windGustiness: 0.4, surrealDepth: 0.2 },
    synthPad: { rootNote: 48, scale: 'lydian', filterCutoffHz: 2400 },
  }),
  preset('alpha-to-delta-descent', 'Sleep Descent', 'sleep', {
    brainwave: { preset: 'alpha', beatHz: 10, carrierHz: 180 },
    sleepTimerMin: 45, fadeOutSec: 90,
    timeline: [
      { id: 'alpha', label: 'Alpha', durationSec: 600, targetBeatHz: 10, targetCarrierHz: 180 },
      { id: 'theta', label: 'Theta', durationSec: 900, targetBeatHz: 5.5, targetCarrierHz: 144 },
      { id: 'delta', label: 'Delta', durationSec: 1200, targetBeatHz: 1.8, targetCarrierHz: 110 },
    ],
  }),
  preset('breath-anchor', 'Breath Anchor', 'meditation', {
    description: 'A ten-second swell, soft rain, and a low sine pad for breath awareness.',
    brainwave: { beatHz: 6, carrierHz: 132, volume: 0.22, rhythmModDepth: 0.64, frequencyDriftDepth: 0.05 },
    nature: { rainIntensity: 0.22, thunderProbability: 0, wildlifeDensity: 0.12, surrealDepth: 0.06 },
    synthPad: { waveform: 'sine', scale: 'sus2_drone', rootNote: 45, filterCutoffHz: 720, shimmerAmount: 0.05 },
  }),
  preset('body-scan', 'Body Scan', 'meditation', {
    description: 'A gradually slowing beat under warm chords and the steady sound of a small stream.',
    brainwave: { beatHz: 6.5, carrierHz: 150, volume: 0.2, rhythmModHz: 0.083, rhythmModDepth: 0.38 },
    nature: { biome: 'night_forest', rainIntensity: 0.12, waterFlow: 0.63, insectBed: 0.1, thunderProbability: 0, wildlifeDensity: 0.08, surrealDepth: 0.04 },
    synthPad: { waveform: 'triangle', scale: 'aeolian', rootNote: 43, filterCutoffHz: 800, evolutionSpeed: 0.12, shimmerAmount: 0.08 },
    timeline: [stage('settling', 'Settling', 5, 6, 144), stage('scan', 'Body scan', 10, 4.5, 120)],
  }),
  preset('open-awareness', 'Open Awareness', 'meditation', {
    description: 'Widely spaced notes and quiet stereo wind leave room for the sounds around you.',
    brainwave: { preset: 'alpha', mode: 'monaural', beatHz: 9, carrierHz: 176, volume: 0.17, rhythmModDepth: 0.16 },
    nature: { biome: 'alpine_wind', rainIntensity: 0, windGustiness: 0.33, thunderProbability: 0, wildlifeDensity: 0.1, waterFlow: 0.2, stereoWidth: 0.98, surrealDepth: 0.1 },
    synthPad: { waveform: 'sine', scale: 'lydian', rootNote: 48, evolutionSpeed: 0.15, shimmerAmount: 0.11 },
  }),
  preset('loving-kindness', 'Loving-Kindness', 'meditation', {
    description: 'Rounded major-leaning harmonies, a soft breath swell, and a distant creek.',
    brainwave: { preset: 'alpha', beatHz: 8.5, carrierHz: 168, volume: 0.19, rhythmModHz: 0.073, rhythmModDepth: 0.48 },
    nature: { rainIntensity: 0.12, waterFlow: 0.61, thunderProbability: 0, wildlifeDensity: 0.28, surrealDepth: 0.14 },
    synthPad: { waveform: 'triangle', scale: 'lydian', rootNote: 53, detuneCents: 5, filterCutoffHz: 1140, shimmerAmount: 0.16 },
  }),
  preset('walking-meditation', 'Walking Meditation', 'meditation', {
    description: 'A quiet speaker-friendly pulse beneath rustling air and bright, short-decay chords.',
    brainwave: { preset: 'alpha', mode: 'isochronic', beatHz: 10.5, carrierHz: 165, volume: 0.21, isochronicDepth: 0.21, rhythmModDepth: 0.07 },
    nature: { biome: 'alpine_wind', rainIntensity: 0.04, windGustiness: 0.44, thunderProbability: 0, wildlifeDensity: 0.3, waterFlow: 0.08, surrealDepth: 0.03 },
    synthPad: { waveform: 'triangle', scale: 'minor_pentatonic', rootNote: 55, tuningHz: 440, filterCutoffHz: 1750, shimmerAmount: 0.04, reverbDecaySec: 3 },
  }),
  preset('quiet-sitting', 'Quiet Sitting', 'meditation', {
    description: 'A dim sine drone, a nearly still forest, and a soft theta-band beat.',
    brainwave: { beatHz: 7.2, carrierHz: 128, volume: 0.16, rhythmModHz: 0.055, rhythmModDepth: 0.12, frequencyDriftDepth: 0.04 },
    nature: { biome: 'night_forest', volume: 0.39, rainIntensity: 0.14, thunderProbability: 0, wildlifeDensity: 0.04, insectBed: 0.08, waterFlow: 0.09, stereoWidth: 0.5, surrealDepth: 0 },
    synthPad: { waveform: 'sine', scale: 'sus2_drone', rootNote: 41, filterCutoffHz: 420, evolutionSpeed: 0.04, shimmerAmount: 0, reverbDecaySec: 3 },
  }),
  preset('sensory-grounding', 'Sensory Grounding', 'meditation', {
    description: 'A close, dry mix of stream, drizzle, and centered notes for attending to one sound at a time.',
    brainwave: { preset: 'alpha', mode: 'monaural', beatHz: 10, carrierHz: 170, volume: 0.16, rhythmModDepth: 0.08 },
    nature: { biome: 'night_forest', rainIntensity: 0.24, waterFlow: 0.53, thunderProbability: 0, wildlifeDensity: 0.08, stereoWidth: 0.36, reverbSpace: 0.12, surrealDepth: 0 },
    synthPad: { waveform: 'sine', scale: 'dorian', rootNote: 48, filterCutoffHz: 950, shimmerAmount: 0, reverbDecaySec: 2.5 },
  }),
  preset('steady-attention', 'Steady Attention', 'focus', {
    description: 'An even isochronic pulse over low wind and a restrained triangle pad.',
    brainwave: { preset: 'smr', mode: 'isochronic', beatHz: 14, carrierHz: 200, volume: 0.22, isochronicDepth: 0.22, rhythmModDepth: 0.06, frequencyDriftDepth: 0 },
    nature: { biome: 'alpine_wind', volume: 0.38, windGustiness: 0.28, rainIntensity: 0, thunderProbability: 0, wildlifeDensity: 0, surrealDepth: 0 },
    synthPad: { waveform: 'triangle', scale: 'sus2_drone', rootNote: 48, tuningHz: 440, evolutionSpeed: 0.08, shimmerAmount: 0.04, reverbDecaySec: 3.5 },
  }),
  preset('creative-association', 'Creative Association', 'focus', {
    description: 'A light, changing harmony with glass overtones, shifting wind, and a soft hybrid pulse.',
    brainwave: { preset: 'alpha', mode: 'hybrid', beatHz: 11.5, carrierHz: 192, volume: 0.22, isochronicDepth: 0.14, frequencyDriftDepth: 0.15 },
    nature: { windGustiness: 0.34, rainIntensity: 0.19, thunderProbability: 0, wildlifeDensity: 0.31, surrealDepth: 0.41 },
    synthPad: { waveform: 'glass_pad', scale: 'lydian', rootNote: 54, tuningHz: 440, detuneCents: 9, filterCutoffHz: 2610, evolutionSpeed: 0.65, shimmerAmount: 0.36 },
  }),
  preset('study-flow', 'Study Flow', 'focus', {
    description: 'A quiet monaural beat and steady rain with almost no movement in the pad.',
    brainwave: { preset: 'beta', mode: 'monaural', beatHz: 18, carrierHz: 207, volume: 0.16, rhythmModDepth: 0, frequencyDriftDepth: 0.02 },
    nature: { biome: 'rainstorm', rainIntensity: 0.46, windGustiness: 0.1, thunderProbability: 0, wildlifeDensity: 0, surrealDepth: 0 },
    synthPad: { waveform: 'sine', scale: 'sus2_drone', rootNote: 43, filterCutoffHz: 540, evolutionSpeed: 0.03, shimmerAmount: 0, reverbDecaySec: 3 },
  }),
  preset('hypnagogic-imagery', 'Hypnagogic Imagery', 'lucid', {
    description: 'A dusk-to-night soundscape inspired by fleeting imagery at the edge of sleep.',
    brainwave: { preset: 'alpha', beatHz: 9.4, carrierHz: 174, volume: 0.2, rhythmModDepth: 0.31 },
    nature: { biome: 'night_forest', rainIntensity: 0.2, insectBed: 0.45, thunderProbability: 0, wildlifeDensity: 0.14, surrealDepth: 0.65 },
    synthPad: { scale: 'aeolian', rootNote: 46, filterCutoffHz: 960, shimmerAmount: 0.44, reverbDecaySec: 12 },
    timeline: [stage('dusk', 'Dusk', 5, 7.8, 153), stage('threshold', 'Sleep threshold', 8, 4.5, 119)],
  }),
  preset('astral-projection', 'Astral Projection · Silver Current', 'lucid', {
    description: 'An astral projection-inspired mix of wide coastal air, drifting harmonics, and a descending stereo beat.',
    brainwave: { beatHz: 6.2, carrierHz: 152, volume: 0.19, rhythmModHz: 0.062, rhythmModDepth: 0.26, frequencyDriftDepth: 0.32 },
    nature: { biome: 'ocean_coast', rainIntensity: 0, windGustiness: 0.31, waterFlow: 0.42, thunderProbability: 0, wildlifeDensity: 0, stereoWidth: 1, reverbSpace: 0.82, surrealDepth: 0.68 },
    synthPad: { waveform: 'glass_pad', scale: 'lydian', rootNote: 48, detuneCents: 13, filterCutoffHz: 1700, evolutionSpeed: 0.24, shimmerAmount: 0.68, reverbDecaySec: 14.5 },
    timeline: [stage('current', 'Silver current', 6, 5.6, 140), stage('open-air', 'Open air', 10, 4.6, 123)],
  }),
  preset('out-of-body', 'Out-of-Body · Floating Perspective', 'lucid', {
    description: 'Inspired by descriptions of out-of-body experiences, with a centered low drone and sounds moving to the edges.',
    brainwave: { mode: 'hybrid', beatHz: 7.6, carrierHz: 156, volume: 0.17, isochronicDepth: 0.13, rhythmModDepth: 0.23 },
    nature: { biome: 'alpine_wind', rainIntensity: 0, windGustiness: 0.35, waterFlow: 0.26, thunderProbability: 0, wildlifeDensity: 0.1, stereoWidth: 1, reverbSpace: 0.75, surrealDepth: 0.74 },
    synthPad: { waveform: 'sine', scale: 'sus2_drone', rootNote: 38, detuneCents: 17, filterCutoffHz: 1100, evolutionSpeed: 0.18, shimmerAmount: 0.51, reverbDecaySec: 14 },
    timeline: [stage('approach', 'Approach', 6, 6.7, 148), stage('drift', 'Floating perspective', 9, 5.4, 136)],
  }),
  preset('vivid-dreaming', 'Vivid Dreaming', 'lucid', {
    description: 'Soft nocturnal calls, moving Dorian harmonies, and a gentle stereo beat.',
    brainwave: { beatHz: 6.8, carrierHz: 138, volume: 0.18, rhythmModHz: 0.074, rhythmModDepth: 0.33 },
    nature: { biome: 'night_forest', rainIntensity: 0.17, thunderProbability: 0, wildlifeDensity: 0.38, insectBed: 0.47, surrealDepth: 0.49 },
    synthPad: { scale: 'dorian', waveform: 'glass_pad', rootNote: 51, filterCutoffHz: 1530, evolutionSpeed: 0.5, shimmerAmount: 0.39, reverbDecaySec: 10 },
  }),
  preset('hallucination-inspired-imagery', 'Hallucination-Inspired Imagery', 'lucid', {
    description: 'Widening echoes and flickering harmonics inspired by descriptions of hallucinations and altered perception.',
    brainwave: { preset: 'alpha', mode: 'hybrid', beatHz: 9, carrierHz: 185, volume: 0.16, isochronicDepth: 0.16, rhythmModDepth: 0.11, frequencyDriftDepth: 0.64 },
    nature: { rainIntensity: 0.24, thunderProbability: 0, wildlifeDensity: 0.27, waterFlow: 0.38, stereoWidth: 0.98, reverbSpace: 0.76, surrealDepth: 0.91 },
    synthPad: { waveform: 'glass_pad', scale: 'lydian', rootNote: 57, tuningHz: 440, detuneCents: 18, filterCutoffHz: 2270, filterLfoRateHz: 0.084, evolutionSpeed: 0.76, shimmerAmount: 0.72, reverbDecaySec: 13 },
    timeline: [stage('pattern', 'Pattern', 4, 7.6, 164), stage('color', 'Color', 4, 10.8, 196), stage('distance', 'Distance', 4, 8.4, 170)],
  }),
  preset('lucid-dream-journal', 'Lucid Dream Journal', 'lucid', {
    description: 'A spare, quietly pulsing mix for writing down a dream or reflecting on its imagery.',
    brainwave: { preset: 'alpha', mode: 'isochronic', beatHz: 8.8, carrierHz: 169, volume: 0.15, isochronicDepth: 0.16, rhythmModDepth: 0.08 },
    nature: { biome: 'night_forest', volume: 0.46, rainIntensity: 0.11, windGustiness: 0.12, thunderProbability: 0, wildlifeDensity: 0.09, waterFlow: 0.34, surrealDepth: 0.13 },
    synthPad: { waveform: 'triangle', scale: 'minor_pentatonic', rootNote: 52, filterCutoffHz: 1290, evolutionSpeed: 0.21, shimmerAmount: 0.14 },
  }),
  preset('floating-threshold', 'Floating Threshold', 'lucid', {
    description: 'Ocean swells and a barely moving low pad with a soft 5.1 Hz stereo beat.',
    brainwave: { beatHz: 5.1, carrierHz: 118, volume: 0.16, rhythmModHz: 0.07, rhythmModDepth: 0.44 },
    nature: { biome: 'ocean_coast', rainIntensity: 0, windGustiness: 0.19, thunderProbability: 0, wildlifeDensity: 0, waterFlow: 0.74, surrealDepth: 0.37 },
    synthPad: { waveform: 'sine', scale: 'sus2_drone', rootNote: 45, filterCutoffHz: 625, evolutionSpeed: 0.08, shimmerAmount: 0.28, reverbDecaySec: 12.5 },
  }),
  preset('psilocybin-bloom', 'Psilocybin (Magic Mushroom) · Bloom', 'psychedelic', {
    description: 'A magic mushroom-inspired palette of granular rainforest, luminous glass harmonics, and changing beat rates.',
    brainwave: { preset: 'alpha', mode: 'hybrid', beatHz: 9.5, carrierHz: 182, volume: 0.16, isochronicDepth: 0.13, rhythmModDepth: 0.18, frequencyDriftDepth: 0.58 },
    nature: { rainIntensity: 0.29, windGustiness: 0.32, thunderProbability: 0, wildlifeDensity: 0.4, waterFlow: 0.35, stereoWidth: 0.98, reverbSpace: 0.73, surrealDepth: 0.86 },
    synthPad: { waveform: 'glass_pad', scale: 'lydian', rootNote: 50, detuneCents: 15, filterCutoffHz: 1960, filterLfoRateHz: 0.08, evolutionSpeed: 0.69, shimmerAmount: 0.7, reverbDecaySec: 13 },
    timeline: [stage('opening', 'Opening', 5, 7.1, 153), stage('bloom', 'Bloom', 8, 10.4, 187), stage('settling', 'Settling', 7, 8.3, 165)],
  }),
  preset('psilocybin-soft-return', 'Psilocybin · Soft Return', 'psychedelic', {
    description: 'A quieter take on the psilocybin-inspired palette, with a stream and warm chords taking the foreground.',
    brainwave: { preset: 'alpha', mode: 'monaural', beatHz: 8.4, carrierHz: 154, volume: 0.14, rhythmModDepth: 0.31, frequencyDriftDepth: 0.1 },
    nature: { biome: 'night_forest', rainIntensity: 0.1, thunderProbability: 0, wildlifeDensity: 0.13, waterFlow: 0.64, surrealDepth: 0.19 },
    synthPad: { waveform: 'triangle', scale: 'dorian', rootNote: 45, filterCutoffHz: 920, evolutionSpeed: 0.19, shimmerAmount: 0.19, reverbDecaySec: 7 },
  }),
  preset('cannabis-warm-drift', 'Cannabis (Marijuana) · Warm Drift', 'psychedelic', {
    description: 'A cannabis-inspired soundscape of warm low chords, slow coastal swells, and a softly pulsed tone.',
    brainwave: { mode: 'isochronic', beatHz: 5.8, carrierHz: 117, volume: 0.18, isochronicDepth: 0.22, rhythmModHz: 0.064, rhythmModDepth: 0.37 },
    nature: { biome: 'ocean_coast', rainIntensity: 0, windGustiness: 0.19, thunderProbability: 0, wildlifeDensity: 0, waterFlow: 0.64, stereoWidth: 0.77, surrealDepth: 0.29 },
    synthPad: { waveform: 'warm_saw', scale: 'minor_pentatonic', rootNote: 43, filterCutoffHz: 590, filterLfoRateHz: 0.027, filterLfoDepth: 0.38, evolutionSpeed: 0.14, shimmerAmount: 0.14, reverbDecaySec: 8 },
  }),
  preset('cannabis-slow-groove', 'Cannabis · Slow Groove', 'psychedelic', {
    description: 'A drier marijuana-inspired mix with filtered bass harmonics, light drizzle, and a gentle monaural rhythm.',
    brainwave: { preset: 'alpha', mode: 'monaural', beatHz: 9.1, carrierHz: 130, volume: 0.19, rhythmModHz: 0.113, rhythmModDepth: 0.46 },
    nature: { biome: 'rainstorm', rainIntensity: 0.36, windGustiness: 0.08, thunderProbability: 0, wildlifeDensity: 0.03, reverbSpace: 0.21, surrealDepth: 0.17 },
    synthPad: { waveform: 'warm_saw', scale: 'dorian', rootNote: 47, tuningHz: 440, detuneCents: 6, filterCutoffHz: 810, filterLfoRateHz: 0.11, evolutionSpeed: 0.28, shimmerAmount: 0.08, reverbDecaySec: 4 },
  }),
  preset('lsd-prism', 'LSD-Inspired · Prism', 'psychedelic', {
    description: 'Bright upper harmonics, wide stereo spread, and a pulse that changes pace as the colors of the mix shift.',
    brainwave: { preset: 'alpha', mode: 'hybrid', beatHz: 10.4, carrierHz: 207, volume: 0.16, isochronicDepth: 0.13, rhythmModDepth: 0.13, frequencyDriftDepth: 0.51 },
    nature: { biome: 'alpine_wind', rainIntensity: 0.18, windGustiness: 0.51, thunderProbability: 0, wildlifeDensity: 0.22, stereoWidth: 1, reverbSpace: 0.85, surrealDepth: 0.89 },
    synthPad: { waveform: 'glass_pad', scale: 'lydian', rootNote: 56, tuningHz: 440, detuneCents: 18, filterCutoffHz: 2610, filterLfoRateHz: 0.092, evolutionSpeed: 0.86, shimmerAmount: 0.77, reverbDecaySec: 13.5 },
    timeline: [stage('refraction', 'Refraction', 5, 13.2, 219), stage('folding', 'Folding', 5, 8.2, 172), stage('clarity', 'Clear light', 6, 10, 190)],
  }),
  preset('dmt-fractal-canopy', 'DMT-Inspired · Fractal Canopy', 'psychedelic', {
    description: 'Dense fragments of rainforest and glassy echoes evolve around a low-volume stereo beat.',
    brainwave: { beatHz: 6.4, carrierHz: 148, volume: 0.15, rhythmModHz: 0.085, rhythmModDepth: 0.13, frequencyDriftDepth: 0.55 },
    nature: { rainIntensity: 0.22, windGustiness: 0.44, thunderProbability: 0, wildlifeDensity: 0.35, stereoWidth: 1, reverbSpace: 0.9, surrealDepth: 0.97 },
    synthPad: { waveform: 'glass_pad', scale: 'dorian', rootNote: 53, tuningHz: 440, detuneCents: 20, filterCutoffHz: 2380, filterLfoRateHz: 0.114, evolutionSpeed: 0.94, shimmerAmount: 0.82, reverbDecaySec: 14 },
    timeline: [stage('canopy', 'Canopy', 4, 11.4, 197), stage('ripples', 'Ripples', 4, 8.2, 162)],
  }),
  preset('mescaline-desert-light', 'Mescaline-Inspired · Desert Light', 'psychedelic', {
    description: 'Spare pentatonic harmonies, dry wind in the foreground, and a soft amber shimmer.',
    brainwave: { preset: 'alpha', mode: 'isochronic', beatHz: 8.9, carrierHz: 163, volume: 0.17, isochronicDepth: 0.19, rhythmModHz: 0.061, rhythmModDepth: 0.18 },
    nature: { biome: 'alpine_wind', rainIntensity: 0, windGustiness: 0.52, thunderProbability: 0, wildlifeDensity: 0.06, waterFlow: 0, reverbSpace: 0.33, surrealDepth: 0.4 },
    synthPad: { waveform: 'triangle', scale: 'minor_pentatonic', rootNote: 50, detuneCents: 7, filterCutoffHz: 1320, filterLfoRateHz: 0.037, evolutionSpeed: 0.44, shimmerAmount: 0.37, reverbDecaySec: 8.5 },
  }),
];

export const factoryPresetGroups = Object.entries(presetCategories)
  .filter(([category]) => category !== 'custom')
  .map(([category, label]) => ({ label, presets: factoryPresets.filter((preset) => preset.category === category) }));
