import { gain } from './utils/audioGraph';
import { equalPowerCrossfade } from './utils/smoothing';

const fadeOut = new Float32Array(64);
const fadeIn = new Float32Array(64);
for (let index = 0; index < 64; index++) {
  [fadeOut[index], fadeIn[index]] = equalPowerCrossfade(index / 63);
}

export class SeamlessLooper {
  readonly output;
  private readonly decks = new Map<AudioBufferSourceNode, GainNode>();
  private nextStart = 0;
  private stoppingAt: number | undefined;
  private readonly crossfade: number;
  private first = true;

  constructor(private readonly context: AudioContext, private readonly buffer: AudioBuffer, destination: AudioNode) {
    this.crossfade = Math.min(5, buffer.duration * 0.25);
    this.output = gain(context, 0);
    this.output.connect(destination);
    this.nextStart = context.currentTime + 0.05;
  }

  fill(lookahead = 78) {
    if (this.stoppingAt !== undefined || this.buffer.duration < 2) return;
    const now = this.context.currentTime;
    if (this.nextStart < now) {
      this.first = true;
      this.nextStart = now + 0.03;
    }
    while (this.nextStart < now + lookahead) {
      const start = this.nextStart;
      const limit = this.first ? this.buffer.duration - this.crossfade * 2 - 0.3 : this.buffer.duration * 0.35;
      const offset = Math.random() * Math.max(0, limit);
      const end = start + this.buffer.duration - offset;
      this.nextStart = end - this.crossfade;

      const envelope = gain(this.context, 0);
      const source = this.context.createBufferSource();
      source.buffer = this.buffer;
      source.connect(envelope).connect(this.output);
      this.decks.set(source, envelope);
      const fadeTime = this.first ? Math.min(0.4, this.crossfade) : this.crossfade;
      envelope.gain.setValueCurveAtTime(fadeIn, start, fadeTime);
      envelope.gain.setValueCurveAtTime(fadeOut, this.nextStart + 0.00001, this.crossfade - 0.00001);
      source.onended = () => {
        source.disconnect();
        envelope.disconnect();
        this.decks.delete(source);
        if (this.stoppingAt !== undefined && this.decks.size === 0) this.output.disconnect();
      };
      source.start(start, offset);
      this.first = false;
    }
  }

  stop(at: number) {
    this.stoppingAt = at;
    for (const source of this.decks.keys()) source.stop(at);
    if (!this.decks.size) this.output.disconnect();
  }
}
