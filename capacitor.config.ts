import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rmanmetaverse.braindaw',
  appName: 'BrainDAW',
  webDir: 'dist',
  backgroundColor: '#070A10',
  android: { path: 'mobile/android', backgroundColor: '#070A10' },
  ios: { path: 'mobile/ios', backgroundColor: '#070A10', contentInset: 'never' },
  plugins: { SystemBars: { style: 'DARK', insetsHandling: 'css' } },
};

export default config;
