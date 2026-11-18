/** Browser file and share helpers (no Vue). */

const UNSAFE = /[\s/\\:*?"<>|]+/g;

/** "netz-steps-<slug>.json", or "netz-steps.json" without a name. */
export function exportFileName(name: string): string {
  const slug = name.trim().replace(UNSAFE, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug ? `netz-steps-${slug}.json` : 'netz-steps.json';
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Opens the share sheet with the file where supported (iOS, Android), else downloads it. */
export async function shareOrDownload(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
      // Some browsers report canShare but then refuse: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Copies text to the clipboard. Returns false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
