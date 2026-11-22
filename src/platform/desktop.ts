import { audioEngine } from '../audio/AudioEngineManager';
import { useAudioStore } from '../store/useAudioStore';

export async function registerDesktopControls() {
  const { listen } = await import('@tauri-apps/api/event');
  await listen<string>('studio-control', ({ payload }) => {
    if (payload === 'toggle-play') void audioEngine.togglePlay();
    if (payload === 'toggle-mute') useAudioStore.getState().toggleMute();
  });
}
