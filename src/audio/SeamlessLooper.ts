import { gain } from './utils/audioGraph';

const loopStarts = new WeakMap<AudioBuffer, number>();

export function sealLoop(buffer: AudioBuffer) {
  const existing = loopStarts.get(buffer);
  if (existing !== undefined) return existing;
  const frames = Math.min(Math.round(5 * buffer.sampleRate), Math.floor(buffer.length / 4));
  if (frames < 2) return 0;
  const curve = new Float32Array(frames);
  for (let index = 0; index < frames; index++) curve[index] = Math.sin(index / (frames - 1) * Math.PI / 2);
  const tail = buffer.length - frames;
  for (let index = 0; index < buffer.numberOfChannels; index++) {
    const samples = buffer.getChannelData(index);
    for (let frame = 0; frame < frames; frame++) {
      samples[tail + frame] = samples[tail + frame] * curve[frames - 1 - frame] + samples[frame] * curve[frame];
    }
  }
  // The tail previews the head. Continue with the next head sample at the wrap.
  const start = frames / buffer.sampleRate;
  loopStarts.set(buffer, start);
  return start;
}

export class SeamlessLooper {
  readonly output;
  private readonly source;

  constructor(context: AudioContext, buffer: AudioBuffer, destination: AudioNode) {
    const loopStart = sealLoop(buffer);
    const source = this.source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = loopStart;
    source.loopEnd = buffer.duration;

    this.output = gain(context, 0);
    source.connect(this.output).connect(destination);
    source.onended = () => {
      source.disconnect();
      this.output.disconnect();
    };
    source.start(context.currentTime + 0.03, loopStart + Math.random() * (buffer.duration - loopStart));
  }

  stop(at: number) {
    this.source.stop(at);
  }
}
