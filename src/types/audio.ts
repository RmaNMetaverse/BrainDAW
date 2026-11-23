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

export type PresetCategory = 'sleep' | 'meditation' | 'focus' | 'lucid' | 'psychedelic' | 'custom';

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

export interface NatureParams {
  enabled: boolean;
  volume: number;              // 0.0 to 1.0
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
  category?: PresetCategory;
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
