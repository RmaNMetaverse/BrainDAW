import type { BrainwaveParams, BrainwavePresetId, NatureParams, NeuroScapePreset, SynthPadParams } from '../types/audio';

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

function preset(id: string, name: string, category: NeuroScapePreset['category'], options: {
  brainwave?: Partial<BrainwaveParams>; nature?: Partial<NatureParams>; synthPad?: Partial<SynthPadParams>;
  timeline?: NeuroScapePreset['timeline']; sleepTimerMin?: number; fadeOutSec?: number;
} = {}): NeuroScapePreset {
  return {
    id, name, category, createdAt: '2025-01-01T00:00:00.000Z', masterVolume: 0.72,
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
];
