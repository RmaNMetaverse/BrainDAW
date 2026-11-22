import type { BrainwaveParams, SessionStage } from '../types/audio';
import { gain, lowpass, oscillator } from './utils/audioGraph';
import { clamp, lerp, smoothParam } from './utils/smoothing';

export function splitFrequencies(carrier: number, beat: number): [number, number] {
  return [carrier - beat / 2, carrier + beat / 2];
}

export class BrainwaveEngine {
  readonly output;
  private readonly left;
  private readonly right;
  private readonly carrier;
  private readonly pulse;
  private readonly split;
  private readonly mono;
  private readonly iso;
  private readonly modulation;
  private readonly pulseDepth;
  private readonly filter;
  private readonly breathing;
  private readonly swellDepth;
  private readonly driftAmount;
  private readonly pulseDrift;
  private previous?: BrainwaveParams;
  private stages: SessionStage[] = [];
  private startTime = 0;
  private initial = { carrierHz: 144, beatHz: 6 };

  constructor(private readonly context: AudioContext) {
    this.output = gain(context, 0);
    this.left = oscillator(context, 141);
    this.right = oscillator(context, 147);
    this.carrier = oscillator(context, 144);
    this.pulse = oscillator(context, 6);
    this.split = gain(context, 0);
    this.mono = gain(context, 0);
    this.iso = gain(context, 0);
    this.modulation = gain(context, 1);
    this.pulseDepth = gain(context, 0);
    this.filter = lowpass(context, 1600);

    const merged = context.createChannelMerger(2);
    this.left.connect(merged, 0, 0);
    this.right.connect(merged, 0, 1);
    merged.connect(this.split).connect(this.modulation);

    const sum = gain(context, 0.5);
    this.left.connect(sum);
    this.right.connect(sum);
    sum.connect(this.mono).connect(this.modulation);
    this.carrier.connect(this.iso).connect(this.modulation);
    this.pulse.connect(this.pulseDepth).connect(this.modulation.gain);

    const swell = gain(context, 0.65);
    this.breathing = oscillator(context, 0.1);
    this.swellDepth = gain(context, 0);
    this.breathing.connect(this.swellDepth).connect(swell.gain);
    this.modulation.connect(swell).connect(this.filter).connect(this.output);

    const drift = oscillator(context, 0.016);
    this.driftAmount = [gain(context, 0), gain(context, 0)];
    drift.connect(this.driftAmount[0]).connect(this.left.frequency);
    drift.connect(this.driftAmount[1]).connect(this.right.frequency);
    this.pulseDrift = gain(context, 0);
    drift.connect(this.pulseDrift).connect(this.pulse.frequency);
  }

  update(params: BrainwaveParams) {
    const now = this.context.currentTime;
    smoothParam(this.output.gain, params.enabled ? params.volume * 0.32 : 0, now);
    smoothParam(this.split.gain, Number(params.mode === 'binaural' || params.mode === 'hybrid'), now);
    smoothParam(this.mono.gain, Number(params.mode === 'monaural'), now);
    smoothParam(this.iso.gain, Number(params.mode === 'isochronic'), now);
    const depth = params.mode === 'isochronic' ? params.isochronicDepth : params.mode === 'hybrid' ? params.isochronicDepth * 0.5 : 0;
    smoothParam(this.modulation.gain, 1 - depth / 2, now);
    smoothParam(this.pulseDepth.gain, depth / 2, now);
    smoothParam(this.filter.frequency, params.warmthFilterHz, now);
    smoothParam(this.breathing.frequency, params.rhythmModHz, now);
    smoothParam(this.swellDepth.gain, params.rhythmModHz > 0 ? params.rhythmModDepth * 0.35 : 0, now);
    const drift = params.frequencyDriftDepth * 0.45;
    smoothParam(this.driftAmount[0].gain, -drift / 2, now);
    smoothParam(this.driftAmount[1].gain, drift / 2, now);
    smoothParam(this.pulseDrift.gain, drift, now);

    if (this.previous?.beatHz !== params.beatHz || this.previous?.carrierHz !== params.carrierHz) {
      this.previous = params;
      this.setTimeline(this.stages);
    }
  }

  private frequencies(carrier: number, beat: number) {
    const [left, right] = splitFrequencies(carrier, beat);
    return [left, right, carrier, beat];
  }

  setTimeline(stages: SessionStage[]) {
    this.stages = stages;
    const now = this.context.currentTime;
    this.startTime = now;
    if (this.previous) this.initial = this.previous;
    const parameters = [this.left.frequency, this.right.frequency, this.carrier.frequency, this.pulse.frequency];
    const start = this.frequencies(this.initial.carrierHz, this.initial.beatHz);
    parameters.forEach((param, index) => smoothParam(param, start[index], now));
    if (!stages.length) return;
    let end = now + 0.2;
    parameters.forEach((param, index) => param.setValueAtTime(start[index], end));
    for (const stage of stages) {
      end += stage.durationSec;
      const targets = this.frequencies(stage.targetCarrierHz, stage.targetBeatHz);
      parameters.forEach((param, index) => param.linearRampToValueAtTime(targets[index], end));
    }
  }

  progress() {
    const elapsed = Math.max(0, this.context.currentTime - this.startTime - 0.2);
    let remaining = elapsed;
    let beat = this.initial.beatHz;
    for (const stage of this.stages) {
      if (remaining < stage.durationSec) {
        return { elapsed: Math.floor(elapsed), beat: lerp(beat, stage.targetBeatHz, clamp(remaining / stage.durationSec)) };
      }
      remaining -= stage.durationSec;
      beat = stage.targetBeatHz;
    }
    return { elapsed: this.stages.length ? Math.floor(elapsed - remaining) : 0, beat };
  }
}
