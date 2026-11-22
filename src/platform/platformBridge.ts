export type RuntimePlatform = 'web' | 'tauri-windows' | 'tauri-macos' | 'capacitor-ios' | 'capacitor-android';

export function detectPlatform(): RuntimePlatform {
  if ('__TAURI_INTERNALS__' in window) return navigator.userAgent.includes('Mac') ? 'tauri-macos' : 'tauri-windows';
  const capacitor = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = capacitor?.getPlatform?.();
  if (platform === 'ios') return 'capacitor-ios';
  if (platform === 'android') return 'capacitor-android';
  return 'web';
}

export function isDesktop() { return detectPlatform().startsWith('tauri-'); }
export function isMobile() { return detectPlatform().startsWith('capacitor-'); }

export function hapticTick() {
  if (isMobile()) {
    void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })).catch(() => undefined);
  } else if (detectPlatform() === 'web' && navigator.maxTouchPoints > 0) {
    navigator.vibrate?.(10);
  }
}
