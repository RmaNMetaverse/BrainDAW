import { audioEngine } from '../audio/AudioEngineManager';
import { useAudioStore } from '../store/useAudioStore';

export function registerBackgroundAudio() {
  if (!('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  const actions = {
    play: () => { void audioEngine.play(); },
    pause: () => { void audioEngine.pause(); },
    stop: () => { void audioEngine.pause(true); },
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
