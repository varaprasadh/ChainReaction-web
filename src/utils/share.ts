export const APP_URL = 'https://chain-reaction3d.web.app';

interface ComposeOpts {
  winnerName: string;
  winnerColor: string;
}

export function composeShareImage({ winnerName, winnerColor }: ComposeOpts): Promise<Blob | null> {
  const canvas = document.querySelector('.app canvas') as HTMLCanvasElement | null;
  if (!canvas) return Promise.resolve(null);

  const srcW = canvas.width;
  const srcH = canvas.height;
  const scale = Math.min(1200 / srcW, 900 / srcH, 1);
  const outW = Math.round(srcW * scale);
  const outH = Math.round(srcH * scale);

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  ctx.drawImage(canvas, 0, 0, outW, outH);

  const bandH = Math.round(outH * 0.34);
  const bandTop = outH - bandH;

  const grad = ctx.createLinearGradient(0, bandTop, 0, outH);
  grad.addColorStop(0, 'rgba(5,6,15,0)');
  grad.addColorStop(0.4, 'rgba(5,6,15,0.65)');
  grad.addColorStop(1, 'rgba(5,6,15,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandTop, outW, bandH);

  const centerX = outW / 2;
  const baseY = outH - 28;

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.round(outH * 0.022)}px -apple-system, "Inter", system-ui, sans-serif`;
  ctx.fillText('WINNER', centerX, baseY - Math.round(outH * 0.18));

  ctx.shadowColor = winnerColor;
  ctx.shadowBlur = Math.round(outH * 0.05);
  ctx.fillStyle = winnerColor;
  ctx.font = `800 ${Math.round(outH * 0.09)}px -apple-system, "Inter", system-ui, sans-serif`;
  ctx.fillText(winnerName, centerX, baseY - Math.round(outH * 0.07));
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `500 ${Math.round(outH * 0.018)}px -apple-system, "Inter", system-ui, sans-serif`;
  ctx.fillText('Chain Reaction · chain-reaction3d.web.app', centerX, baseY);

  return new Promise((resolve) => {
    out.toBlob((b) => resolve(b), 'image/png');
  });
}

export function shareText(winnerName: string): string {
  return `${winnerName} just won at Chain Reaction! ⚛️💥`;
}

export function canNativeShare(blob: Blob | null): boolean {
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  if (!nav.share) return false;
  if (!blob) return true;
  const file = new File([blob], 'chain-reaction.png', { type: 'image/png' });
  return !!nav.canShare?.({ files: [file] });
}

export async function nativeShare(
  blob: Blob | null,
  text: string,
  url: string,
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  if (!nav.share) return 'unsupported';
  const file = blob ? new File([blob], 'chain-reaction.png', { type: 'image/png' }) : null;
  const data: ShareData & { files?: File[] } = { text, url, title: 'Chain Reaction' };
  if (file && nav.canShare?.({ files: [file] })) {
    data.files = [file];
  }
  try {
    await nav.share(data);
    return 'shared';
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

export async function copyShareLink(text: string, url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return true;
  } catch {
    return false;
  }
}
