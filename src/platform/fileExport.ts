import { strToU8, unzipSync, zipSync } from 'fflate';

export async function exportFile(name: string, contents: string | Uint8Array, mime: string) {
  const bytes = typeof contents === 'string' ? strToU8(contents) : contents;
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function fileBasename(name: string) {
  return name.normalize('NFKC').replace(/[^a-z0-9_-]+/gi, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 65) || 'BrainDAW';
}

export async function exportBiome(name: string, files: File[]) {
  const archive: Record<string, Uint8Array> = Object.create(null);
  for (const file of files) archive[file.name] = new Uint8Array(await file.arrayBuffer());
  await exportFile(fileBasename(name) + '.zip', zipSync(archive, { level: 0 }), 'application/zip');
}

export async function expandBiomeImport(files: File[]) {
  if (files.length !== 1 || !/\.zip$/i.test(files[0].name)) return files;
  const limit = 64 * 1024 ** 2;
  if (files[0].size > limit) throw new Error('Biome archives can contain up to 64 MB.');
  let total = 0;
  let count = 0;
  const entries = unzipSync(new Uint8Array(await files[0].arrayBuffer()), {
    filter: ({ name, originalSize }) => {
      if (name.endsWith('/')) return false;
      if (++count > 25 || (total += originalSize) > limit || /[\\/\x00-\x1f]/.test(name)) {
        throw new Error('Use a flat archive with up to 25 files and 64 MB of recordings.');
      }
      return true;
    },
  });
  return Object.entries(entries).map(([name, data]) => new File([new Uint8Array(data)], name));
}
