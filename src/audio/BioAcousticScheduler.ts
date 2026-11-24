import type { NatureParams } from '../types/audio';
import type { DecodedBiome } from './BiomePackLoader';
import { gain, lowpass } from './utils/audioGraph';
import { ShuffleBag } from './utils/shuffleBag';
import { clamp, lerp, smoothParam } from './utils/smoothing';

const categories = ['thunder', 'wildlife', 'accents'] as const;
type Category = typeof categories[number];

export const poissonDelay = (mean: number, random = Math.random()) => -mean * Math.log1p(-clamp(random, 0.000001, 0.999));
const intervals: Record<Category, [number, number]> = { thunder: [90, 12], wildlife: [35, 2.5], accents: [46, 5] };

export class BioAcousticScheduler {
  private readonly next: Partial<Record<Category, number>> = {};
  private readonly bags: Record<Category, ShuffleBag<AudioBuffer>>;
  private readonly active = new Map<AudioBufferSourceNode, { envelope: GainNode; at: number }>();
  private params?: NatureParams;

  constructor(private readonly context: AudioContext, private readonly clips: DecodedBiome['oneshots'],
    private readonly dry: AudioNode, private readonly wet: AudioNode, private readonly shimmer: AudioNode) {
    this.bags = { thunder: new ShuffleBag(clips.thunder), wildlife: new ShuffleBag(clips.wildlife), accents: new ShuffleBag(clips.accents) };
  }

  update(params: NatureParams) {
    const previous = this.params;
    this.params = params;
    if (!previous || previous.enabled !== params.enabled || previous.thunderProbability !== params.thunderProbability ||
        previous.thunderDistance !== params.thunderDistance || previous.wildlifeDensity !== params.wildlifeDensity ||
        previous.rainIntensity !== params.rainIntensity || previous.stereoWidth !== params.stereoWidth ||
        previous.reverbSpace !== params.reverbSpace || previous.surrealDepth !== params.surrealDepth) {
      const now = this.context.currentTime;
      for (const [source, event] of this.active) {
        if (event.at > now) {
          source.stop(now);
          this.active.delete(source);
        }
      }
      for (const category of categories) delete this.next[category];
    }
  }

  tick() {
    const params = this.params;
    if (!params?.enabled) return;
    const now = this.context.currentTime;
    const densities = { thunder: params.thunderProbability, wildlife: params.wildlifeDensity, accents: params.rainIntensity * 0.42 };
    for (const category of categories) {
      const density = densities[category];
      if (density < 0.02 || !this.clips[category].length) {
        delete this.next[category];
        continue;
      }
      const interval = lerp(...intervals[category], density * density);
      let next = this.next[category] ?? now + poissonDelay(interval);
      if (next < now) next = now + poissonDelay(interval);
      while (next < now + 8 && this.active.size < 36) {
        const buffer = this.bags[category].next();
        if (buffer) this.schedule(buffer, next, category, density, params);
        next += Math.max(0.08, poissonDelay(interval));
      }
      this.next[category] = next;
    }
  }

  stop() {
    const now = this.context.currentTime;
    for (const [source, { envelope, at }] of this.active) {
      smoothParam(envelope.gain, 0, now, 0.16);
      source.stop(at > now ? now : now + 1);
    }
  }

  private schedule(buffer: AudioBuffer, at: number, category: Category, density: number, params: NatureParams) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const playbackRate = 1 + (Math.random() * 2 - 1) * 0.06;
    source.playbackRate.setValueAtTime(playbackRate, at);
    const distance = clamp(category === 'thunder' ? params.thunderDistance + Math.random() * 0.5 - 0.25 : Math.random(), 0.05, 1);
    const air = lowpass(this.context, 18000 * 0.04 ** distance);
    const pan = this.context.createStereoPanner();
    pan.pan.setValueAtTime((Math.random() * 1.7 - 0.85) * params.stereoWidth, at);
    const envelope = gain(this.context, 0);
    const duration = buffer.duration / playbackRate;
    const end = at + duration;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(0.25 + density * 0.4, at + Math.min(0.025, duration / 4));
    envelope.gain.setValueAtTime(0.25 + density * 0.4, end - Math.min(0.06, duration / 4));
    envelope.gain.linearRampToValueAtTime(0, end);
    const direct = gain(this.context, 1 - 0.65 * distance);
    const space = gain(this.context, (0.15 + 0.75 * distance) * params.reverbSpace);
    const surreal = gain(this.context, Math.max(0, params.surrealDepth - 0.2) * 0.9);
    source.connect(air).connect(pan).connect(envelope);
    envelope.connect(direct).connect(this.dry);
    envelope.connect(space).connect(this.wet);
    envelope.connect(surreal).connect(this.shimmer);
    this.active.set(source, { envelope, at });
    source.onended = () => {
      for (const node of [source, air, pan, envelope, direct, space, surreal]) node.disconnect();
      this.active.delete(source);
    };
    source.start(at);
  }
}
