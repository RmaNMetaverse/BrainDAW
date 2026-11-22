import { openDB, type DBSchema } from 'idb';
import type { BiomePackManifest, NeuroScapePreset } from '../types/audio';

interface BrainDawDatabase extends DBSchema {
  presets: { key: string; value: NeuroScapePreset };
  settings: { key: string; value: NeuroScapePreset };
  biomeManifests: { key: string; value: BiomePackManifest };
  recordings: { key: string; value: ArrayBuffer };
}

let db: ReturnType<typeof openDB<BrainDawDatabase>> | undefined;
export function database() {
  db ??= openDB<BrainDawDatabase>('braindaw', 1, {
    upgrade(database) {
      database.createObjectStore('presets', { keyPath: 'id' });
      database.createObjectStore('settings');
      database.createObjectStore('biomeManifests', { keyPath: 'id' });
      database.createObjectStore('recordings');
    },
  }).catch((error: unknown) => {
    db = undefined;
    throw error;
  });
  return db;
}
