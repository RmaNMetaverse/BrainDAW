import { database } from '../store/database';
import type { BiomePackManifest } from '../types/audio';

export interface DecodedBiome {
  manifest: BiomePackManifest;
  beds: {
    rainTiers: (AudioBuffer | undefined)[];
    windTiers: (AudioBuffer | undefined)[];
    insectBed?: AudioBuffer;
    waterFlow?: AudioBuffer;
    ambientAir?: AudioBuffer;
  };
  oneshots: { thunder: AudioBuffer[]; wildlife: AudioBuffer[]; accents: AudioBuffer[] };
  impulse?: AudioBuffer;
}

export function isBiomeManifest(value: unknown): value is BiomePackManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Partial<BiomePackManifest>;
  const path = (entry: unknown) => typeof entry === 'string' && entry.length > 0 && entry.length < 512 &&
    !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(entry) && !entry.includes('\\');
  const files = (entries: unknown, count?: number) => Array.isArray(entries) &&
    (count === undefined ? entries.length <= 32 : entries.length === count) && entries.every(path);
  const { beds, oneshots } = manifest;
  return typeof manifest.id === 'string' && /^[a-z0-9_-]{1,64}$/.test(manifest.id) &&
    typeof manifest.name === 'string' && manifest.name.trim().length > 0 && manifest.name.length <= 100 &&
    typeof manifest.version === 'string' && manifest.version.length <= 32 &&
    !!beds && !!oneshots && (beds.rainTiers === undefined || files(beds.rainTiers, 3)) &&
    (beds.windTiers === undefined || files(beds.windTiers, 2)) &&
    [manifest.impulseResponseUrl, beds.insectBed, beds.waterFlow, beds.ambientAir].every((entry) => entry === undefined || path(entry)) &&
    files(oneshots.thunder) && files(oneshots.wildlife) && (oneshots.accents === undefined || files(oneshots.accents));
}

const assetKey = (manifest: BiomePackManifest, path: string) => manifest.id + '/' + manifest.version + '/' + path;
const localPrefix = 'user-';
const stemNames = ['ambientAir', 'insectBed', 'waterFlow'] as const;

export class BiomePackLoader {
  constructor(private readonly context: AudioContext) {}

  async manifests() {
    const cached = await (await database()).getAll('biomeManifests');
    return cached.filter((manifest) => manifest.id.startsWith(localPrefix));
  }

  async importFiles(files: File[]) {
    if (files.length > 25 || files.reduce((sum, file) => sum + file.size, 0) > 64 * 1024 ** 2) {
      throw new Error('A biome can contain up to 25 files and 64 MB of recordings.');
    }
    const definition = files.find((file) => /\.json$/i.test(file.name));
    const audio = files.filter((file) => file !== definition);
    if (audio.length === 0) throw new Error('Add at least one audio recording.');
    if (new Set(audio.map((file) => file.name)).size !== audio.length) throw new Error('Recording names must be unique.');

    let manifest: BiomePackManifest;
    if (definition) {
      const json: unknown = JSON.parse(await definition.text());
      if (!isBiomeManifest(json)) throw new Error('Invalid biome manifest.');
      manifest = { ...json, id: localPrefix + crypto.randomUUID() };
    } else {
      const [bed, ...shots] = audio;
      manifest = { id: localPrefix + crypto.randomUUID(), name: bed.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Custom biome',
        version: '1', beds: { ambientAir: bed.name }, oneshots: { thunder: [], wildlife: shots.map((file) => file.name) } };
    }

    const supplied = new Map<string, ArrayBuffer>();
    for (const file of audio) {
      const bytes = await file.arrayBuffer();
      const decoded = await this.context.decodeAudioData(bytes.slice(0));
      if (decoded.duration > 240 || decoded.numberOfChannels > 2) throw new Error('Use mono or stereo recordings up to 4 minutes each.');
      supplied.set(file.name, bytes);
    }
    const paths = this.paths(manifest);
    if (!paths.length || paths.some((path) => !supplied.has(path))) throw new Error('Add every recording listed in the manifest.');
    const db = await database();
    const transaction = db.transaction(['biomeManifests', 'recordings'], 'readwrite');
    await Promise.all([
      transaction.objectStore('biomeManifests').put(manifest),
      ...paths.map((path) => transaction.objectStore('recordings').put(supplied.get(path)!, assetKey(manifest, path))),
      transaction.done,
    ]);
    return manifest;
  }

  async exportFiles(id: string) {
    const db = await database();
    const manifest = await db.get('biomeManifests', id);
    if (!manifest || !id.startsWith(localPrefix)) throw new Error('Custom biome not found.');
    return [
      new File([JSON.stringify(manifest, null, 2)], 'manifest.json', { type: 'application/json' }),
      ...await Promise.all(this.paths(manifest).map(async (path) => {
        const bytes = await db.get('recordings', assetKey(manifest, path));
        if (!bytes) throw new Error('A recording is missing from this biome.');
        return new File([bytes], path);
      })),
    ];
  }

  private paths(manifest: BiomePackManifest) {
    return [...new Set([
      ...(manifest.beds.rainTiers ?? []), ...(manifest.beds.windTiers ?? []),
      ...stemNames.map((key) => manifest.beds[key]), manifest.impulseResponseUrl,
      ...manifest.oneshots.thunder, ...manifest.oneshots.wildlife, ...(manifest.oneshots.accents ?? []),
    ].filter((path): path is string => !!path))];
  }

  async load(id: string, signal: AbortSignal): Promise<DecodedBiome | undefined> {
    if (!/^[a-z0-9_-]{1,64}$/.test(id)) return;
    const db = await database().catch(() => undefined);
    const base = new URL('biomes/' + id + '/', document.baseURI);
    let manifest = await db?.get('biomeManifests', id).catch(() => undefined);
    if (!id.startsWith(localPrefix)) {
      const response = await fetch(new URL('manifest.json', base), { signal }).catch(() => undefined);
      if (response?.ok) {
        const json: unknown = await response.json().catch(() => undefined);
        if (isBiomeManifest(json) && json.id === id) {
          manifest = json;
          void db?.put('biomeManifests', json).catch(() => undefined);
        }
      }
    }
    if (!manifest || signal.aborted) return;
    const definition = manifest;
    const decoded = new Map<string, AudioBuffer>();
    await Promise.all(this.paths(manifest).map(async (path) => {
      try {
        const key = assetKey(definition, path);
        const cached = await db?.get('recordings', key).catch(() => undefined);
        const url = new URL(path, base);
        if (!cached && (id.startsWith(localPrefix) || url.origin !== base.origin || !url.pathname.startsWith(new URL('../', base).pathname))) return;
        const response = cached ? undefined : await fetch(url, { signal });
        if (!cached && !response?.ok) return;
        const bytes = cached ?? await response!.arrayBuffer();
        if (signal.aborted) return;
        let buffer: AudioBuffer;
        try {
          buffer = await this.context.decodeAudioData(bytes.slice(0));
        } catch (error) {
          if (id.startsWith(localPrefix) || !path.endsWith('.opus')) throw error;
          const fallback = await fetch(new URL(path.replace(/\.opus$/, '.m4a'), base), { signal });
          if (!fallback.ok) return;
          buffer = await this.context.decodeAudioData(await fallback.arrayBuffer());
        }
        if (signal.aborted) return;
        decoded.set(path, buffer);
        if (!cached) void db?.put('recordings', bytes, key).catch(() => undefined);
      } catch {
        // An unavailable stem leaves its procedural counterpart active.
      }
    }));
    if (!decoded.size || signal.aborted) return;
    const read = (path?: string) => path ? decoded.get(path) : undefined;
    const oneShots = (paths: string[] = []) => paths.map(read).filter((buffer): buffer is AudioBuffer => !!buffer);
    return {
      manifest, impulse: read(manifest.impulseResponseUrl),
      beds: {
        rainTiers: (manifest.beds.rainTiers ?? []).map(read),
        windTiers: (manifest.beds.windTiers ?? []).map(read),
        insectBed: read(manifest.beds.insectBed), waterFlow: read(manifest.beds.waterFlow),
        ambientAir: read(manifest.beds.ambientAir),
      },
      oneshots: { thunder: oneShots(manifest.oneshots.thunder), wildlife: oneShots(manifest.oneshots.wildlife), accents: oneShots(manifest.oneshots.accents) },
    };
  }
}
