export const APP_URL = 'https://chain-reaction3d.web.app';

export function captureBoardBlob(): Promise<Blob | null> {
  const canvas = document.querySelector('.app canvas') as HTMLCanvasElement | null;
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

export function shareText(winnerName: string): string {
  return `${winnerName} just won at Chain Reaction! ⚛️💥`;
}

export function shareLinks(text: string, url: string) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return {
    x: `https://x.com/intent/tweet?text=${t}&url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
  };
}

export async function tryNativeShare(
  blob: Blob | null,
  text: string,
  url: string,
): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  if (!nav.share) return false;
  const file = blob ? new File([blob], 'chain-reaction.png', { type: 'image/png' }) : null;
  const data: ShareData = { text, url, title: 'Chain Reaction' };
  if (file && nav.canShare?.({ files: [file] })) {
    (data as ShareData & { files: File[] }).files = [file];
  }
  try {
    await nav.share(data);
    return true;
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return true;
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
