import type { NatureParams } from '../types/audio';
import { gain } from './utils/audioGraph';
import { smoothParam } from './utils/smoothing';

export class NatureEngine {
  readonly output;
  private readonly fallback;

  constructor(private readonly context: AudioContext) {
    this.output = gain(context, 0);
    this.fallback = new AudioWorkletNode(context, 'nature-noise', { numberOfInputs: 0, outputChannelCount: [2] });
    this.fallback.connect(this.output);
  }

  update(params: NatureParams) {
    const now = this.context.currentTime;
    smoothParam(this.output.gain, params.enabled ? params.volume : 0, now);
    const noise = {
      rain: params.rainIntensity, wind: params.windGustiness, thunder: params.thunderProbability,
      distance: params.thunderDistance, water: params.waterFlow, insects: params.insectBed,
      wildlife: params.wildlifeDensity, width: params.stereoWidth,
      character: params.biome === 'alpine_wind' ? 0.9 : params.biome === 'ocean_coast' ? 0.15 : 0.35,
    };
    for (const [key, value] of Object.entries(noise)) {
      const param = this.fallback.parameters.get(key);
      if (param) smoothParam(param, value, now);
    }
  }
}
