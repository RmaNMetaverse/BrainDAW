import { useAudioStore } from '../store/useAudioStore';
import { PlaybackOutput, preferMixableBrowserAudio, prepareMobilePlayback } from '../platform/nativeAudio';
import { detectPlatform } from '../platform/platformBridge';
import { BrainwaveEngine } from './BrainwaveEngine';
import { NatureEngine } from './NatureEngine';
import { SynthPadEngine } from './SynthPadEngine';
import { gain } from './utils/audioGraph';
import { smoothParam } from './utils/smoothing';

async function loadWorklet(context: AudioContext, name: string) {
  const url = new URL('worklets/' + name + '.worklet.js', document.baseURI).href;
  try {
    await context.audioWorklet.addModule(url);
  } catch (error) {
    const file = await fetch(url);
    if (!file.ok) throw error;
    const module = URL.createObjectURL(new Blob([await file.text()], { type: 'text/javascript' }));
    try { await context.audioWorklet.addModule(module); }
    finally { URL.revokeObjectURL(module); }
  }
}

class AudioEngineManager {
  private context?: AudioContext;
  private master?: GainNode;
  private sleepGain?: GainNode;
  private meter?: AnalyserNode;
  private playbackOutput?: PlaybackOutput;
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
    // Ambient playback can trade control latency for more headroom under Android UI load.
    const context = new AudioContext({ latencyHint: detectPlatform() === 'capacitor-android' ? 0.18 : 'playback' });
    this.context = context;
    try {
      await context.resume();
      await Promise.all(['noise-generator', 'granular-cloud', 'shimmer-reverb', 'playback-clock'].map((name) => loadWorklet(context, name)));
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
      this.master.connect(limiter).connect(this.sleepGain).connect(this.meter);
      this.playbackOutput = new PlaybackOutput(context, this.meter);
      this.brainwave = new BrainwaveEngine(context);
      this.nature = new NatureEngine(context, (biomeLoadingState, usingProceduralFallback) => {
        const state = useAudioStore.getState();
        if (state.biomeLoadingState !== biomeLoadingState || state.usingProceduralFallback !== usingProceduralFallback) {
          useAudioStore.setState({ biomeLoadingState, usingProceduralFallback });
        }
      });
      this.pad = new SynthPadEngine(context);
      this.brainwave.output.connect(this.master);
      this.nature.output.connect(this.master);
      this.pad.output.connect(this.master);
      const clock = new AudioWorkletNode(context, 'playback-clock', { numberOfInputs: 0 });
      clock.port.onmessage = () => {
        try {
          this.schedule();
          this.updateProgress();
        } finally {
          clock.port.postMessage(null);
        }
      };
      clock.connect(this.master);

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
      const platform = detectPlatform();
      if (platform === 'web' || platform === 'capacitor-android') {
        const recover = () => {
          if (document.hidden || !useAudioStore.getState().isPlaying || context.state === 'running' || context.state === 'closed') return;
          preferMixableBrowserAudio();
          void context.resume().catch(() => undefined);
        };
        document.addEventListener('visibilitychange', recover);
        if (platform === 'capacitor-android') window.addEventListener('braindawwindowfocus', recover);
      }
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
      this.sleepGain.gain.linearRampToValueAtTime(0, this.sleepDeadline);
    }
  }

  private schedule() {
    if (!useAudioStore.getState().isPlaying) return;
    this.pad?.tick();
    this.nature?.tick();
  }

  private updateProgress() {
    if (!this.context || !useAudioStore.getState().isPlaying) return;
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
      preferMixableBrowserAudio();
      const native = prepareMobilePlayback().catch(() => undefined);
      await this.init();
      await native;
      await this.context?.resume();
      await this.playbackOutput?.play();
      if (this.resetOnPlay) {
        this.resetOnPlay = false;
        this.brainwave?.setTimeline(useAudioStore.getState().timeline);
        this.resetSleep();
      }
      useAudioStore.setState({ isPlaying: true });
      this.updateMaster();
      this.schedule();
      this.updateProgress();
      this.timer = setInterval(() => {
        if (!document.hidden) this.updateProgress();
      }, 250);
    } catch (error) {
      useAudioStore.setState({ error: error instanceof Error ? error.message : 'Audio could not start.' });
    } finally {
      useAudioStore.setState({ busy: false });
    }
  }

  async pause(finished = false, reset = finished) {
    if (!useAudioStore.getState().isPlaying || useAudioStore.getState().busy) return;
    useAudioStore.setState({ isPlaying: false, busy: true });
    this.resetOnPlay = reset;
    this.updateMaster();
    clearInterval(this.timer);
    try {
      if (!finished) {
        const latency = Math.min(0.5, (this.context?.baseLatency ?? 0) + (this.context?.outputLatency ?? 0));
        await new Promise((resolve) => setTimeout(resolve, 350 + latency * 1000));
      }
      this.playbackOutput?.pause();
      if (this.context && this.context.state !== 'closed' && this.context.state !== 'suspended') await this.context.suspend();
    } finally {
      useAudioStore.setState({ busy: false });
    }
  }
}

export const audioEngine = new AudioEngineManager();
