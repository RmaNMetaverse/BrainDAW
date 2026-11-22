import { useAudioStore } from '../store/useAudioStore';
import { BrainwaveEngine } from './BrainwaveEngine';
import { NatureEngine } from './NatureEngine';
import { SynthPadEngine } from './SynthPadEngine';
import { gain } from './utils/audioGraph';
import { smoothParam } from './utils/smoothing';

class AudioEngineManager {
  private context?: AudioContext;
  private master?: GainNode;
  private sleepGain?: GainNode;
  private meter?: AnalyserNode;
  private brainwave?: BrainwaveEngine;
  private nature?: NatureEngine;
  private pad?: SynthPadEngine;
  private sleepDeadline: number | null = null;
  private initialized = false;
  private timer?: ReturnType<typeof setInterval>;
  private resetOnPlay = false;

  get analyser() { return this.meter; }

  private async init() {
    if (this.initialized) return;
    const context = new AudioContext({ latencyHint: 'playback' });
    this.context = context;
    try {
      await context.resume();
      await context.audioWorklet.addModule(new URL('worklets/noise-generator.worklet.js', document.baseURI).href);
      this.master = gain(context, 0);
      this.sleepGain = gain(context, 1);
      this.meter = context.createAnalyser();
      this.meter.fftSize = 1024;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-2, context.currentTime);
      limiter.knee.setValueAtTime(6, context.currentTime);
      limiter.ratio.setValueAtTime(12, context.currentTime);
      limiter.attack.setValueAtTime(0.003, context.currentTime);
      limiter.release.setValueAtTime(0.15, context.currentTime);
      this.master.connect(limiter).connect(this.sleepGain).connect(this.meter).connect(context.destination);
      this.brainwave = new BrainwaveEngine(context);
      this.nature = new NatureEngine(context);
      this.pad = new SynthPadEngine(context);
      this.brainwave.output.connect(this.master);
      this.nature.output.connect(this.master);
      this.pad.output.connect(this.master);

      const state = useAudioStore.getState();
      this.brainwave.update(state.brainwave);
      this.brainwave.setTimeline(state.timeline);
      this.nature.update(state.nature);
      this.pad.update(state.synthPad);
      this.resetSleep();
      useAudioStore.subscribe((state) => state.brainwave, (value) => this.brainwave?.update(value));
      useAudioStore.subscribe((state) => state.nature, (value) => this.nature?.update(value));
      useAudioStore.subscribe((state) => state.synthPad, (value) => this.pad?.update(value));
      useAudioStore.subscribe((state) => state.timeline, (value) => this.brainwave?.setTimeline(value));
      useAudioStore.subscribe((state) => state.masterVolume, () => this.updateMaster());
      useAudioStore.subscribe((state) => state.isMuted, () => this.updateMaster());
      useAudioStore.subscribe((state) => state.sleepTimerMin, () => this.resetSleep());
      useAudioStore.subscribe((state) => state.fadeOutSec, () => this.resetSleep());
      useAudioStore.subscribe((state) => state.activePresetId, () => this.resetSleep());
      this.initialized = true;
    } catch (error) {
      await context.close();
      this.context = undefined;
      throw error;
    }
  }

  private updateMaster() {
    if (!this.master || !this.context) return;
    const { isPlaying, isMuted, masterVolume } = useAudioStore.getState();
    smoothParam(this.master.gain, isPlaying && !isMuted ? masterVolume : 0, this.context.currentTime, 0.055);
  }

  private resetSleep() {
    if (!this.context || !this.sleepGain) return;
    const { sleepTimerMin, fadeOutSec } = useAudioStore.getState();
    const now = this.context.currentTime;
    smoothParam(this.sleepGain.gain, 1, now);
    this.sleepDeadline = sleepTimerMin === null ? null : now + sleepTimerMin * 60;
    if (this.sleepDeadline !== null) {
      const fadeStart = Math.max(now + 0.005, this.sleepDeadline - fadeOutSec);
      this.sleepGain.gain.setValueAtTime(1, fadeStart);
      this.sleepGain.gain.linearRampToValueAtTime(0.0001, this.sleepDeadline);
    }
  }

  private tick() {
    if (!this.context) return;
    this.pad?.tick();
    const current = this.brainwave?.progress();
    const remaining = this.sleepDeadline === null ? null : Math.max(0, Math.ceil(this.sleepDeadline - this.context.currentTime));
    const state = useAudioStore.getState();
    if (current && (current.elapsed !== state.sessionElapsedSec || current.beat !== state.actualBeatHz || remaining !== state.sleepTimerRemainingSec)) {
      useAudioStore.setState({ sessionElapsedSec: current.elapsed, actualBeatHz: current.beat, sleepTimerRemainingSec: remaining });
    }
    if (remaining === 0 && state.isPlaying) void this.pause(true);
  }

  async togglePlay() {
    const state = useAudioStore.getState();
    if (state.busy) return;
    if (state.isPlaying) await this.pause();
    else await this.play();
  }

  async play() {
    if (useAudioStore.getState().busy || useAudioStore.getState().isPlaying) return;
    useAudioStore.setState({ busy: true, error: null });
    try {
      await this.init();
      await this.context?.resume();
      if (this.resetOnPlay) {
        this.resetOnPlay = false;
        this.brainwave?.setTimeline(useAudioStore.getState().timeline);
        this.resetSleep();
      }
      useAudioStore.setState({ isPlaying: true });
      this.updateMaster();
      this.tick();
      this.timer = setInterval(() => this.tick(), 250);
    } catch (error) {
      useAudioStore.setState({ error: error instanceof Error ? error.message : 'Audio could not start.' });
    } finally {
      useAudioStore.setState({ busy: false });
    }
  }

  async pause(finished = false) {
    if (!useAudioStore.getState().isPlaying || useAudioStore.getState().busy) return;
    useAudioStore.setState({ isPlaying: false, busy: true });
    this.resetOnPlay = finished;
    this.updateMaster();
    clearInterval(this.timer);
    try {
      if (!finished) await new Promise((resolve) => setTimeout(resolve, 350));
      if (this.context?.state === 'running') await this.context.suspend();
    } finally {
      useAudioStore.setState({ busy: false });
    }
  }
}

export const audioEngine = new AudioEngineManager();
