class NatureNoise extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return ['rain', 'wind', 'thunder', 'distance', 'water', 'insects', 'wildlife', 'width', 'character'].map((name) => ({
      name, defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate',
    }));
  }

  constructor() {
    super();
    this.filters = [new Float64Array(11), new Float64Array(11)];
    this.thunder = 0;
    this.call = 0;
    this.phase = 0;
    this.callPhase = 0;
    this.callFrequency = 1200;
  }

  process(_inputs, outputs, params) {
    const [left, right] = outputs[0];
    if (!left || !right) return true;
    const rain = params.rain[0], wind = params.wind[0], water = params.water[0];
    const wildlife = params.wildlife[0], thunder = params.thunder[0], distance = params.distance[0];
    const insects = params.insects[0], width = params.width[0], character = params.character[0];
    const callRate = wildlife < 0.02 ? 0 : (0.06 + wildlife * wildlife * 0.37) / sampleRate;
    const thunderRate = thunder < 0.02 ? 0 : (0.02 + thunder * thunder * 0.2) / sampleRate;
    for (let frame = 0; frame < left.length; frame++) {
      this.phase += 0.9 / sampleRate;
      if (this.phase >= 1) this.phase -= 1;
      const swell = 0.65 + 0.22 * Math.sin(2 * Math.PI * this.phase);
      if (Math.random() < thunderRate && this.thunder < 0.05) this.thunder = 1;
      if (Math.random() < callRate && this.call < 0.01) {
        this.call = 1;
        this.callFrequency = 850 + Math.random() * 1700;
      }
      this.thunder *= 1 - (0.7 + distance * 0.5) / sampleRate;
      this.call *= 1 - 12 / sampleRate;
      this.callPhase = (this.callPhase + this.callFrequency * (1 + 0.38 * this.call) / sampleRate) % 1;
      const call = Math.sin(2 * Math.PI * this.callPhase) * this.call * (1 - this.call) * wildlife * 0.055;
      const cricket = Math.sin(2 * Math.PI * frame / left.length + this.phase * 60) * 0.5 + 0.5;
      let first = 0;
      for (let channel = 0; channel < 2; channel++) {
        const f = this.filters[channel];
        const white = Math.random() * 2 - 1;
        f[0] = f[0] * 0.99886 + white * 0.0555179;
        f[1] = f[1] * 0.99332 + white * 0.0750759;
        f[2] = f[2] * 0.969 + white * 0.153852;
        f[3] = f[3] * 0.8665 + white * 0.3104856;
        f[4] = f[4] * 0.55 + white * 0.5329522;
        f[5] = -f[5] * 0.7616 - white * 0.016898;
        const pink = (f[0] + f[1] + f[2] + f[3] + f[4] + f[5] + f[6] + white * 0.5362) * 0.11;
        f[6] = white * 0.115926;
        f[7] = f[7] * 0.994 + white * 0.022;
        f[8] += (pink - f[8]) * (0.09 + character * 0.07);
        f[9] += (f[7] - f[9]) * (0.018 - distance * 0.012);
        f[10] += (pink - f[10]) * 0.035;
        const sample = (pink - f[8]) * rain * 0.54 + f[10] * rain * 0.16
          + (f[8] - f[10]) * wind * swell * 0.85 + f[10] * water * (1 - swell * 0.6) * 0.7
          + f[9] * this.thunder * (1 - distance * 0.6) * thunder * 0.7
          + (white - f[8]) * insects * cricket * 0.009 + call * (channel ? 0.55 : 1);
        if (channel === 0) first = sample;
        else {
          const middle = (sample + first) * 0.5;
          left[frame] = middle + (first - middle) * width;
          right[frame] = middle + (sample - middle) * width;
        }
      }
    }
    return true;
  }
}

registerProcessor('nature-noise', NatureNoise);
