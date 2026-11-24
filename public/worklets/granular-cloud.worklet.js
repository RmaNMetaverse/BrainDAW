class GranularCloud extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'depth', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }];
  }

  constructor() {
    super();
    this.grains = Array.from({ length: 16 }, () => ({ age: 0, length: 0, position: 0, rate: 1, left: 0, right: 0 }));
    this.buffer = [];
    this.countdown = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'LOAD_BUFFER') {
        this.buffer = data.channels;
        for (const grain of this.grains) grain.length = 0;
      }
    };
  }

  spawn(depth, size) {
    for (const grain of this.grains) {
      if (grain.age < grain.length) continue;
      const pan = Math.random() * Math.PI * 0.5;
      grain.position = Math.random() * size;
      grain.length = Math.round((0.18 + Math.random() * 0.57) * sampleRate);
      grain.age = 0;
      grain.rate = 0.92 + Math.random() * 0.16;
      if (depth > 0.6 && Math.random() < 0.24) grain.rate *= Math.random() < 0.55 ? 0.5 : 2;
      grain.left = Math.cos(pan);
      grain.right = Math.sin(pan);
      return;
    }
  }

  process(_inputs, outputs, params) {
    const [left, right] = outputs[0];
    const first = this.buffer[0], second = this.buffer[1] ?? first;
    if (!first || !left || !right) return true;
    const depth = params.depth[0];
    if (depth <= 0.001) return true;
    const size = first.length;
    for (let frame = 0; frame < left.length; frame++) {
      if (--this.countdown <= 0) {
        this.spawn(depth, size);
        this.countdown = sampleRate * (0.72 + Math.random() * 0.56) / (2 + depth * 12);
      }
      for (const grain of this.grains) {
        if (grain.age >= grain.length) continue;
        const index = Math.floor(grain.position);
        const fraction = grain.position - index;
        const next = (index + 1) % size;
        const window = (1 - Math.cos(2 * Math.PI * grain.age / (grain.length - 1))) * depth * 0.15;
        left[frame] += (first[index] + (first[next] - first[index]) * fraction) * grain.left * window;
        right[frame] += (second[index] + (second[next] - second[index]) * fraction) * grain.right * window;
        grain.position = (grain.position + grain.rate) % size;
        grain.age++;
      }
    }
    return true;
  }
}

registerProcessor('granular-cloud', GranularCloud);
