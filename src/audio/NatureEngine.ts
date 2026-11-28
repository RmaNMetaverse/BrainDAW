import type { BiomePackManifest, NatureParams, NatureSoundParams } from '../types/audio';
import { database } from '../store/database';
import { BioAcousticScheduler } from './BioAcousticScheduler';
import { BiomePackLoader, type DecodedBiome } from './BiomePackLoader';
import { SeamlessLooper } from './SeamlessLooper';
import { gain, impulse, lowpass, oscillator } from './utils/audioGraph';
import { clamp, equalPowerCrossfade, smoothParam } from './utils/smoothing';
import { legacyNatureCorner, natureCornerIndexes, natureWeights, type NatureCornerIndex } from './natureBlend';

type Scene = {
  level: GainNode;
  loops: { looper: SeamlessLooper; key: string; trim: number }[];
  events: BioAcousticScheduler;
  outdoor: ConvolverNode;
  granular: AudioWorkletNode;
  shimmer: AudioWorkletNode;
  windMod: GainNode;
  width: GainNode[];
  samples: DecodedBiome;
  stop: (now: number, immediate: boolean) => void;
};

class NatureVoice {
  readonly output;
  private readonly fallback;
  private readonly fallbackSpace;
  private readonly fallbackShimmer;
  private readonly loader;
  private scene?: Scene;
  private params?: NatureSoundParams;
  private request?: AbortController;
  private weight = 0;

  constructor(private readonly context: AudioContext, private readonly onStatus: (message: string, fallback: boolean) => void) {
    this.output = gain(context, 0);
    this.loader = new BiomePackLoader(context);
    this.fallback = new AudioWorkletNode(context, 'nature-noise', { numberOfInputs: 0, outputChannelCount: [2] });
    const space = this.fallbackShimmer = this.makeShimmer();
    this.fallbackSpace = gain(context, 0);
    this.fallback.connect(this.output);
    this.fallback.connect(space).connect(this.fallbackSpace).connect(this.output);
    space.parameters.get('shimmer')?.setValueAtTime(0.45, context.currentTime);
  }

  private makeShimmer() {
    return new AudioWorkletNode(this.context, 'shimmer-reverb', { outputChannelCount: [2] });
  }

  private makeScene(samples: DecodedBiome): Scene {
    const context = this.context;
    const field = gain(context, 1);
    const level = gain(context, 0);
    const outdoor = context.createConvolver();
    outdoor.buffer = samples.impulse ?? impulse(context, 2.4);
    outdoor.connect(gain(context, 0.45)).connect(field);
    const granular = new AudioWorkletNode(context, 'granular-cloud', { numberOfInputs: 0, outputChannelCount: [2] });
    const shimmer = this.makeShimmer();
    granular.connect(shimmer);
    granular.connect(gain(context, 0.28)).connect(field);
    shimmer.connect(gain(context, 0.6)).connect(field);

    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    field.connect(splitter);
    const width = Array.from({ length: 4 }, (_, index) => {
      const matrix = gain(context, index % 3 === 0 ? 1 : 0);
      splitter.connect(matrix, Math.floor(index / 2));
      matrix.connect(merger, 0, index % 2);
      return matrix;
    });
    merger.connect(level).connect(this.output);

    const wind = gain(context, 0.78);
    const windMod = gain(context, 0);
    const windOsc = oscillator(context, 0.074);
    windOsc.connect(windMod).connect(wind.gain);
    wind.connect(lowpass(context, 2300)).connect(field);
    const loops: Scene['loops'] = [];
    const shared = new Set([samples.impulse, ...Object.values(samples.oneshots).flat()]);
    const copies = new Map<AudioBuffer, AudioBuffer>();
    const add = (key: string, buffer: AudioBuffer | undefined, trim: number, destination = field) => {
      if (!buffer || buffer.duration < 2) return;
      if (shared.has(buffer)) {
        const original = buffer;
        buffer = copies.get(original) ?? context.createBuffer(original.numberOfChannels, original.length, original.sampleRate);
        if (!copies.has(original)) {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            buffer.getChannelData(channel).set(original.getChannelData(channel));
          }
          copies.set(original, buffer);
        }
      }
      const looper = new SeamlessLooper(context, buffer, destination);
      loops.push({ looper, key, trim });
    };
    samples.beds.rainTiers.forEach((buffer, index) => add('rain' + index, buffer, 0.63 + index * 0.075));
    samples.beds.windTiers.forEach((buffer, index) => add('wind' + index, buffer, 0.47, wind));
    add('insects', samples.beds.insectBed, 0.43);
    add('water', samples.beds.waterFlow, 0.56);
    add('air', samples.beds.ambientAir, 0.34);

    const texture = samples.beds.ambientAir ?? samples.beds.rainTiers.find(Boolean) ?? samples.beds.waterFlow ?? samples.beds.windTiers.find(Boolean);
    if (texture) {
      const channels = Array.from({ length: Math.min(texture.numberOfChannels, 2) }, (_, index) =>
        texture.getChannelData(index).slice(0, Math.min(texture.length, texture.sampleRate * 55)));
      granular.port.postMessage({ type: 'LOAD_BUFFER', channels }, channels.map((channel) => channel.buffer));
    }
    const events = new BioAcousticScheduler(context, samples.oneshots, field, outdoor, shimmer);
    const stop = (now: number, immediate: boolean) => {
      smoothParam(level.gain, 0, now, 0.26);
      const end = immediate ? now : now + 1.5;
      for (const { looper } of loops) looper.stop(end);
      events.stop();
      windOsc.onended = () => windOsc.disconnect();
      windOsc.stop(end);
      const disconnect = () => {
        granular.port.close();
        shimmer.port.close();
        for (const node of [outdoor, granular, shimmer, level, field, merger, splitter, wind, windMod, ...width]) node.disconnect();
      };
      if (immediate) disconnect();
      else setTimeout(disconnect, 1750);
    };
    smoothParam(level.gain, 1, context.currentTime, 0.26);
    return { level, loops, events, outdoor, granular, shimmer, windMod, width, samples, stop };
  }

  private async select(biome: string) {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    if (this.scene) {
      this.scene.stop(this.context.currentTime, this.context.state !== 'running');
      this.scene = undefined;
      this.apply(0.26);
    }
    if (biome === 'fireside') {
      this.onStatus('Procedural fireside', true);
      return;
    }
    this.onStatus('Loading recordings…', true);
    const samples = await this.loader.load(biome, request.signal).catch(() => undefined);
    if (request.signal.aborted) return;
    if (!samples) {
      this.onStatus('Procedural soundscape', true);
      return;
    }
    this.scene = this.makeScene(samples);
    this.apply(0.26);
    this.onStatus('Field recordings active', false);
  }

  update(params: NatureSoundParams) {
    if (this.params === params) return;
    const changed = this.params?.biome !== params.biome;
    this.params = params;
    if (changed) void this.select(params.biome);
    this.apply();
  }

  setWeight(weight: number) {
    if (weight === this.weight) return;
    const powered = this.weight > 0;
    this.weight = weight;
    smoothParam(this.output.gain, weight, this.context.currentTime);
    if (powered !== (weight > 0)) this.apply();
  }

  dispose() {
    this.request?.abort();
    const running = this.context.state === 'running';
    this.scene?.stop(this.context.currentTime, !running);
    this.setWeight(0);
    const disconnect = () => {
      this.fallback.port.close();
      this.fallbackShimmer.port.close();
      for (const node of [this.fallback, this.fallbackShimmer, this.fallbackSpace, this.output]) node.disconnect();
    };
    if (running) setTimeout(disconnect, 350);
    else disconnect();
  }

  private apply(timeConstant = 0.04) {
    const params = this.params;
    if (!params) return;
    const scene = this.scene;
    const now = this.context.currentTime;
    const change = (param: AudioParam | undefined, value: number) => {
      if (param) smoothParam(param, value, now, timeConstant);
    };
    const active = this.weight > 0;
    const rain = params.rainIntensity;
    const [low, high] = equalPowerCrossfade(rain < 0.5 ? rain * 2 : rain * 2 - 1);
    const [softWind, strongWind] = equalPowerCrossfade(params.windGustiness);
    const levels: Record<string, number> = {
      rain0: rain < 0.5 ? low * clamp(rain / 0.05) : 0, rain1: rain < 0.5 ? high : low,
      rain2: rain < 0.5 ? 0 : high, wind0: softWind * params.windGustiness,
      wind1: strongWind * params.windGustiness, air: 0.55 + params.wildlifeDensity * 0.32,
      insects: params.insectBed, water: params.waterFlow,
    };
    const has = (key: string) => scene?.loops.some((loop) => loop.key === key);
    const noise = {
      rain: rain * (has(rain < 0.5 ? 'rain0' : 'rain2') || has('rain1') ? 0 : 1),
      wind: has('wind0') || has('wind1') ? 0 : params.windGustiness,
      thunder: scene?.samples.oneshots.thunder.length ? 0 : params.thunderProbability,
      distance: params.thunderDistance, water: has('water') ? 0 : params.waterFlow,
      insects: has('insects') ? 0 : params.insectBed,
      wildlife: scene?.samples.oneshots.wildlife.length ? 0 : params.wildlifeDensity,
      width: params.stereoWidth,
      character: params.biome === 'alpine_wind' ? 0.9 : params.biome === 'ocean_coast' ? 0.15 : 0.35,
      fire: params.biome === 'fireside' ? 1 : 0,
      fireCrackle: params.fireCrackle ?? 0.55,
      fireWarmth: params.fireWarmth ?? 0.62,
    };
    for (const [key, value] of Object.entries(noise)) change(this.fallback.parameters.get(key), active ? value : 0);
    change(this.fallbackSpace.gain, params.reverbSpace * 0.06 + params.surrealDepth * 0.27);
    if (!scene) return;
    scene.events.update(params, active);
    const ordinary = 1 - params.surrealDepth * 0.41;
    for (const { looper, key, trim } of scene.loops) change(looper.output.gain, active ? levels[key] * trim * ordinary : 0);
    change(scene.windMod.gain, params.windGustiness * 0.2);
    scene.width.forEach((node, index) => change(node.gain, (1 + (index % 3 === 0 ? 1 : -1) * params.stereoWidth) / 2));
    change(scene.granular.parameters.get('depth'), active ? params.surrealDepth : 0);
    change(scene.shimmer.parameters.get('shimmer'), params.surrealDepth * 0.88);
    change(scene.shimmer.parameters.get('decay'), 4 + params.surrealDepth * 7);
  }

  tick() {
    this.scene?.events.tick();
  }
}

type Slot = { voice: NatureVoice; status: string; fallback: boolean; weight: number };

export class NatureEngine {
  readonly output;
  private readonly slots: Partial<Record<NatureCornerIndex, Slot>> = {};
  private volume = 0;

  constructor(private readonly context: AudioContext, private readonly onStatus: (message: string, fallback: boolean) => void) {
    this.output = gain(context, 0);
  }

  static async listCustom() {
    return (await (await database()).getAll('biomeManifests')).filter(({ id }) => id.startsWith('user-'));
  }

  static async importFiles(files: File[]): Promise<BiomePackManifest> {
    const context = new AudioContext();
    try {
      return await new BiomePackLoader(context).importFiles(files);
    } finally {
      await context.close();
    }
  }

  static async exportFiles(id: string) { return BiomePackLoader.exportFiles(id); }

  update(params: NatureParams) {
    const volume = params.enabled ? params.volume : 0;
    if (volume !== this.volume) {
      smoothParam(this.output.gain, volume, this.context.currentTime);
      this.volume = volume;
    }
    const { blend } = params;
    const single = legacyNatureCorner(params.biome);
    const weights = blend ? natureWeights(blend.x, blend.y) : undefined;
    for (const index of natureCornerIndexes) {
      let slot = this.slots[index];
      if (!(blend || index === single) || (!params.enabled && !slot)) {
        if (slot) {
          slot.voice.dispose();
          delete this.slots[index];
        }
        continue;
      }
      if (!slot) {
        const voice = new NatureVoice(this.context, (status, fallback) => {
          const current = this.slots[index];
          if (current?.voice !== voice) return;
          current.status = status;
          current.fallback = fallback;
          this.publishStatus();
        });
        voice.output.connect(this.output);
        slot = this.slots[index] = { voice, status: '', fallback: true, weight: 0 };
      }
      const weight = volume > 0 ? (weights?.[index] ?? 1) : 0;
      slot.weight = weight;
      slot.voice.setWeight(weight);
      slot.voice.update(blend?.corners[index] ?? params);
    }
    this.publishStatus();
  }

  private publishStatus() {
    const audible = Object.values(this.slots).filter((slot) => slot.weight > 0);
    if (!audible.length) return this.onStatus('', true);
    if (audible.length === 1) return this.onStatus(audible[0].status, audible[0].fallback);
    const loading = audible.some((slot) => slot.status === 'Loading recordings…');
    const fallback = audible.every((slot) => slot.fallback);
    this.onStatus(loading ? 'Loading corner recordings…' : 'Four-corner mix active', fallback);
  }

  tick() {
    for (const slot of Object.values(this.slots)) if (slot.weight > 0) slot.voice.tick();
  }
}
