class PlaybackClock extends AudioWorkletProcessor {
  constructor() {
    super();
    this.next = currentFrame;
    this.waiting = false;
    this.port.onmessage = () => { this.waiting = false; };
  }

  process() {
    // Keep at most one notification pending when the page is busy or in the background.
    if (!this.waiting && currentFrame >= this.next) {
      this.next = currentFrame + sampleRate;
      this.waiting = true;
      this.port.postMessage(null);
    }
    return true;
  }
}

registerProcessor('playback-clock', PlaybackClock);
