import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { registerBackgroundAudio } from './platform/backgroundAudio';
import { detectPlatform } from './platform/platformBridge';
import { restoreStudio } from './store/presets';
import './studio.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
void restoreStudio().catch(() => undefined);
registerBackgroundAudio();
if (import.meta.env.PROD && detectPlatform() === 'web') registerSW({ immediate: true });
