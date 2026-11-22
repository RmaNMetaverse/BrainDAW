class ShimmerReverb extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'shimmer', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 7, minValue: 2, maxValue: 16, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.lines = [0.053, 0.071, 0.089, 0.113].map((length) => new Float32Array(Math.round(length * sampleRate)));
    this.offsets = new Uint32Array(4);
    this.damped = new Float32Array(4);
    this.pitch = new Float32Array(Math.round(0.16 * sampleRate));
    this.head = 0;
    this.phase = 0;
    this.filter = 1 - Math.exp(-2 * Math.PI * 4500 / sampleRate);
  }

  tap(delay) {
    const position = (this.head - delay + this.pitch.length) % this.pitch.length;
    const index = Math.floor(position);
    const fraction = position - index;
    return this.pitch[index] + (this.pitch[(index + 1) % this.pitch.length] - this.pitch[index]) * fraction;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const out = outputs[0];
    if (!out[0] || !out[1]) return true;
    const decay = params.decay[0], shimmer = params.shimmer[0];
    const width = this.pitch.length * 0.58;
    const feedback = Math.pow(0.001, 0.085 / decay) * (1 - shimmer * 0.2);
    for (let frame = 0; frame < out[0].length; frame++) {
      let sum = 0;
      for (let index = 0; index < 4; index++) {
        this.damped[index] += (this.lines[index][this.offsets[index]] - this.damped[index]) * this.filter;
        sum += this.damped[index];
      }
      this.pitch[this.head] = sum * 0.25;
      const overlap = (this.phase + 0.5) % 1;
      const window = 0.5 - 0.5 * Math.cos(this.phase * 2 * Math.PI);
      const pitched = (this.tap(3 + (1 - this.phase) * width) * window + this.tap(3 + (1 - overlap) * width) * (1 - window)) * shimmer * 0.35;
      const left = input[0]?.[frame] ?? 0;
      const right = input[1]?.[frame] ?? left;
      for (let index = 0; index < 4; index++) {
        const excitation = index % 2 ? right : left;
        const reflected = this.damped[index] - sum * 0.5;
        this.lines[index][this.offsets[index]] = excitation * 0.32 + reflected * feedback + pitched * (index === 2 ? -1 : 1);
        this.offsets[index] = (this.offsets[index] + 1) % this.lines[index].length;
      }
      out[0][frame] = (this.damped[0] - this.damped[1] + this.damped[2] * 0.6) * 0.55;
      out[1][frame] = (this.damped[2] - this.damped[3] + this.damped[0] * 0.6) * 0.55;
      this.head = (this.head + 1) % this.pitch.length;
      this.phase = (this.phase + 1 / width) % 1;
    }
    return true;
  }
}

registerProcessor('shimmer-reverb', ShimmerReverb);
