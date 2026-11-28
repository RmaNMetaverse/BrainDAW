import type { NatureBlend, NatureParams, NatureSoundParams } from '../types/audio';
import { clamp } from './utils/smoothing';

export const natureCornerIndexes = [0, 1, 2, 3] as const;
export type NatureCornerIndex = typeof natureCornerIndexes[number];

export const natureCornerPositions = [
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 },
] as const;

export function natureWeights(x: number, y: number) {
  x = clamp(x);
  y = clamp(y);
  return [(1 - x) * y, x * y, (1 - x) * (1 - y), x * (1 - y)] as const;
}

export function legacyNatureCorner(biome: string): NatureCornerIndex {
  const index = defaultBiomes.indexOf(biome);
  return index < 0 ? 3 : natureCornerIndexes[index];
}

const defaultBiomes: string[] = ['fireside', 'rainstorm', 'ocean_coast', 'jungle'];
const base: NatureSoundParams = {
  biome: 'jungle', rainIntensity: 0, thunderProbability: 0, thunderDistance: 0.7,
  windGustiness: 0, wildlifeDensity: 0, insectBed: 0, waterFlow: 0, stereoWidth: 0.8,
  reverbSpace: 0.3, surrealDepth: 0,
};

const voicings: Record<string, Partial<NatureSoundParams>> = {
  fireside: { fireCrackle: 0.55, fireWarmth: 0.62, stereoWidth: 0.72 },
  rainstorm: { rainIntensity: 0.62, windGustiness: 0.17, thunderProbability: 0.11 },
  ocean_coast: { waterFlow: 0.7, windGustiness: 0.19, stereoWidth: 0.94 },
  jungle: { wildlifeDensity: 0.48, insectBed: 0.22, waterFlow: 0.16 },
  night_forest: { wildlifeDensity: 0.3, insectBed: 0.4, windGustiness: 0.13 },
  alpine_wind: { windGustiness: 0.65, waterFlow: 0.1 },
};

export function natureSoundForBiome(biome: string): NatureSoundParams {
  return { ...base, ...voicings[biome], biome };
}

export function createNatureBlend(x = 0.5, y = 0.5): NatureBlend {
  return { x, y, corners: [natureSoundForBiome('fireside'), natureSoundForBiome('rainstorm'),
    natureSoundForBiome('ocean_coast'), natureSoundForBiome('jungle')] };
}

export function readNatureBlend(params: NatureParams): NatureBlend {
  if (params.blend) return params.blend;
  const { enabled: _enabled, volume: _volume, blend: _blend, ...sound } = params;
  const index = legacyNatureCorner(sound.biome);
  const origin = natureCornerPositions[index];
  const blend = createNatureBlend(origin.x, origin.y);
  blend.corners[index] = sound;
  return blend;
}
