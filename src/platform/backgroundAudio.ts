import { audioEngine } from '../audio/AudioEngineManager';
import { useAudioStore } from '../store/useAudioStore';
import { getMixWithOthers, studioAudio, type MobilePlayback } from './nativeAudio';
import { isMobile } from './platformBridge';

function registerNativeControls() {
  let mayResume = false;
  let interruption: Promise<void> | undefined;
  void studioAudio.addListener('transport', ({ action }) => {
    const { isPlaying } = useAudioStore.getState();
    if (action === 'interrupt') {
      mayResume = isPlaying;
      if (isPlaying) interruption = audioEngine.pause();
    } else if (action === 'resume') {
      if (mayResume) {
        mayResume = false;
        void (interruption ?? Promise.resolve()).then(() => audioEngine.play());
      }
    } else {
      mayResume = false;
      if (action === 'play') void (interruption ?? Promise.resolve()).then(() => audioEngine.play());
      if (action === 'pause' || action === 'lost-route') void audioEngine.pause();
      if (action === 'stop') void audioEngine.pause(false, true);
    }
  }).catch(() => undefined);

  let last: MobilePlayback | undefined;
  let lastDeadline: number | null = null;
  const publish = () => {
    const { activePresetName, isPlaying, sleepTimerRemainingSec } = useAudioStore.getState();
    if (!last && !isPlaying) return;
    const deadline = sleepTimerRemainingSec === null ? null : Date.now() + sleepTimerRemainingSec * 1000;
    if (last?.playing === isPlaying && last.title === activePresetName) {
      if (lastDeadline === deadline || (lastDeadline !== null && deadline !== null && Math.abs(lastDeadline - deadline) < 1600)) return;
    }
    last = { title: activePresetName, playing: isPlaying, remaining: sleepTimerRemainingSec, mixWithOthers: getMixWithOthers() };
    lastDeadline = deadline;
    void studioAudio.setPlayback(last).catch(() => undefined);
  };
  useAudioStore.subscribe((state) => state.activePresetName, publish);
  useAudioStore.subscribe((state) => state.isPlaying, publish);
  useAudioStore.subscribe((state) => state.sleepTimerRemainingSec, () => {
    if (useAudioStore.getState().isPlaying) publish();
  });
}

export function registerBackgroundAudio() {
  if (isMobile()) { registerNativeControls(); return; }
  if (!('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  const actions = {
    play: () => { void audioEngine.play(); },
    pause: () => { void audioEngine.pause(); },
    stop: () => { void audioEngine.pause(false, true); },
  } as const;
  for (const action of Object.keys(actions) as (keyof typeof actions)[]) {
    try { session.setActionHandler(action, actions[action]); } catch { /* Optional Media Session action. */ }
  }
  const update = () => {
    const { activePresetName, isPlaying } = useAudioStore.getState();
    if ('MediaMetadata' in window && session.metadata?.title !== activePresetName) {
      session.metadata = new MediaMetadata({
        title: activePresetName, artist: 'BrainDAW · NeuroScape Studio',
        artwork: [{ src: new URL('icon-512.png', document.baseURI).href, sizes: '512x512', type: 'image/png' }],
      });
    }
    session.playbackState = isPlaying ? 'playing' : 'paused';
  };
  update();
  useAudioStore.subscribe((state) => state.activePresetName, update);
  useAudioStore.subscribe((state) => state.isPlaying, update);
}
