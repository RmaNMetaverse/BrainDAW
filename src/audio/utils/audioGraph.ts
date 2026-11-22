export function gain(context: BaseAudioContext, value: number) {
  const node = context.createGain();
  node.gain.setValueAtTime(value, context.currentTime);
  return node;
}

export function oscillator(context: BaseAudioContext, frequency: number, type: OscillatorType = 'sine') {
  const node = context.createOscillator();
  node.frequency.setValueAtTime(frequency, context.currentTime);
  node.type = type;
  node.start();
  return node;
}

export function lowpass(context: BaseAudioContext, frequency: number, q = 0.7) {
  const node = context.createBiquadFilter();
  node.type = 'lowpass';
  node.frequency.setValueAtTime(frequency, context.currentTime);
  node.Q.setValueAtTime(q, context.currentTime);
  return node;
}

export function impulse(context: BaseAudioContext, duration: number, damping = 3.1) {
  const length = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let previous = 0;
    for (let index = 0; index < length; index++) {
      previous = previous * 0.63 + (Math.random() * 2 - 1) * 0.37;
      data[index] = previous * (1 - index / length) ** damping * Math.min(1, index / 400);
    }
  }
  return buffer;
}
