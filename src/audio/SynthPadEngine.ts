import type { SynthPadParams } from '../types/audio';
import { gain, lowpass, oscillator } from './utils/audioGraph';
import { initialVoicing, midiToHz, neighboringNotes } from './utils/musicTheory';
import { lerp, smoothParam } from './utils/smoothing';

type Voice = { a: OscillatorNode; b: OscillatorNode; envelope: GainNode };
const positions = [-0.65, -0.3, 0, 0.3, 0.65];

export class SynthPadEngine {
  readonly output;
  private readonly voices: Voice[];
  private readonly sub;
  private readonly filters;
  private readonly filterLfo;
  private readonly filterDepth;
  private readonly reverb;
  private readonly reverbLevel;
  private readonly reverbInput;
  private readonly glass;
  private readonly warm;
  private params?: SynthPadParams;
  private notes: number[] = [];
  private nextEvolution = 0;
  private lastVoice = 0;

  constructor(private readonly context: AudioContext) {
    this.output = gain(context, 0);
    const voiceBus = gain(context, 1);
    this.voices = positions.map((position) => {
      const a = oscillator(context, 110), b = oscillator(context, 110);
      const mix = gain(context, 0.5), envelope = gain(context, 0);
      const pan = context.createStereoPanner();
      pan.pan.setValueAtTime(position, context.currentTime);
      a.connect(mix);
      b.connect(mix);
      mix.connect(envelope).connect(pan).connect(voiceBus);
      return { a, b, envelope };
    });
    this.sub = oscillator(context, 55);
    const subGain = gain(context, 0.25);
    this.sub.connect(subGain).connect(this.voices[0].envelope);
    this.filters = [lowpass(context, 1250, 0.85), lowpass(context, 1250, 0.85)];
    this.filterLfo = oscillator(context, 0.055);
    this.filterDepth = gain(context, 0);
    this.filterLfo.connect(this.filterDepth);
    for (const filter of this.filters) this.filterDepth.connect(filter.frequency);
    const filtered = voiceBus.connect(this.filters[0]).connect(this.filters[1]);
    filtered.connect(this.output);

    const ensembleLfo = oscillator(context, 0.18);
    for (const [time, side] of [[0.018, -0.75], [0.024, 0.75]]) {
      const delay = context.createDelay(0.07);
      delay.delayTime.setValueAtTime(time, context.currentTime);
      ensembleLfo.connect(gain(context, side < 0 ? -0.0025 : 0.0025)).connect(delay.delayTime);
      const pan = context.createStereoPanner();
      pan.pan.setValueAtTime(side, context.currentTime);
      filtered.connect(delay).connect(pan).connect(gain(context, 0.19)).connect(this.output);
    }

    this.reverb = new AudioWorkletNode(context, 'shimmer-reverb', { outputChannelCount: [2] });
    this.reverbLevel = gain(context, 0.2);
    this.reverbInput = gain(context, 1);
    filtered.connect(this.reverbInput);
    this.reverbInput.connect(this.reverb).connect(lowpass(context, 4500)).connect(this.reverbLevel).connect(this.output);
    const harmonics = new Float32Array([0, 1, 0.35, 0.15, 0.08, 0.04]);
    this.glass = context.createPeriodicWave(new Float32Array(harmonics.length), harmonics);
    const saw = new Float32Array([0, 1, -0.5, 0.29, -0.17, 0.09, -0.045, 0.018]);
    this.warm = context.createPeriodicWave(new Float32Array(saw.length), saw);
  }

  update(params: SynthPadParams) {
    const previous = this.params;
    this.params = params;
    const now = this.context.currentTime;
    smoothParam(this.output.gain, params.enabled ? params.volume : 0, now);
    smoothParam(this.filterLfo.frequency, params.filterLfoRateHz, now);
    smoothParam(this.filterDepth.gain, params.filterLfoDepth * params.filterCutoffHz * 0.65, now);
    smoothParam(this.reverbLevel.gain, 0.15 + params.shimmerAmount * 0.26, now);
    const shimmer = this.reverb.parameters.get('shimmer');
    const decay = this.reverb.parameters.get('decay');
    if (shimmer) smoothParam(shimmer, params.shimmerAmount, now);
    if (decay) smoothParam(decay, params.reverbDecaySec, now);
    for (const filter of this.filters) smoothParam(filter.frequency, params.filterCutoffHz, now);
    if (!previous || previous.reverbDecaySec !== params.reverbDecaySec) {
      smoothParam(this.reverbInput.gain, 0.65 + params.reverbDecaySec / 20, now);
    }

    this.voices.forEach(({ a, b }) => {
      smoothParam(a.detune, -params.detuneCents, now);
      smoothParam(b.detune, params.detuneCents, now);
      if (previous?.waveform !== params.waveform) {
        for (const oscillator of [a, b]) {
          if (params.waveform === 'glass_pad') oscillator.setPeriodicWave(this.glass);
          else if (params.waveform === 'warm_saw') oscillator.setPeriodicWave(this.warm);
          else oscillator.type = params.waveform;
        }
      }
    });

    if (!previous || previous.rootNote !== params.rootNote || previous.scale !== params.scale || previous.tuningHz !== params.tuningHz) {
      this.notes = initialVoicing(params.rootNote, params.scale);
      this.notes.forEach((note, index) => this.tuneVoice(index, note, now, 0.35));
      smoothParam(this.sub.frequency, midiToHz(params.rootNote - 12, params.tuningHz), now, 0.35);
      this.voices.forEach(({ envelope }) => smoothParam(envelope.gain, 0.085, now, 1.5));
    }
    if (!previous || previous.evolutionSpeed !== params.evolutionSpeed) this.nextEvolution = now + lerp(36, 10, params.evolutionSpeed);
  }

  private tuneVoice(index: number, note: number, at: number, glide: number) {
    const frequency = midiToHz(note, this.params?.tuningHz);
    smoothParam(this.voices[index].a.frequency, frequency, at, glide);
    smoothParam(this.voices[index].b.frequency, frequency, at, glide);
  }

  tick() {
    const now = this.context.currentTime;
    const params = this.params;
    if (!params?.enabled || now + 8 < this.nextEvolution) return;
    const start = Math.max(now, this.nextEvolution);
    this.nextEvolution = start + lerp(36, 10, params.evolutionSpeed);
    const choices = [1, 2, 3, 4].filter((voice) => voice !== this.lastVoice).map((voice) => ({
      voice, notes: neighboringNotes(params.rootNote, params.scale, this.notes, voice),
    })).filter(({ notes }) => notes.length);
    if (!choices.length) return;
    const { voice, notes } = choices[Math.floor(Math.random() * choices.length)];
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.lastVoice = voice;
    const envelope = this.voices[voice].envelope.gain;
    smoothParam(envelope, 0.001, start, 1.5);
    this.tuneVoice(voice, note, start + 6, 0.7);
    envelope.setTargetAtTime(0.085, start + 6, 1.6);
    this.notes[voice] = note;
  }
}
