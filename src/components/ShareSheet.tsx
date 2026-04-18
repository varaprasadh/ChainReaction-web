import { useEffect, useState } from 'react';
import { APP_URL, downloadBlob, shareLinks, shareText } from '../utils/share';

interface Props {
  blob: Blob | null;
  winnerName: string;
  onClose: () => void;
}

export function ShareSheet({ blob, winnerName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const text = shareText(winnerName);
  const links = shareLinks(text, APP_URL);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${text} ${APP_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  function handleDownload() {
    if (!blob) return;
    downloadBlob(blob, `chain-reaction-${Date.now()}.png`);
  }

  function openExternal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=640');
  }

  return (
    <div className="modal-backdrop share-backdrop" onClick={onClose}>
      <div className="modal share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-label">Share</div>
        {previewUrl && (
          <div className="share-preview">
            <img src={previewUrl} alt="Board preview" />
          </div>
        )}
        <div className="share-grid">
          <button className="share-btn" onClick={() => openExternal(links.x)}>
            <span className="share-ico share-x">𝕏</span>
            <span>X</span>
          </button>
          <button className="share-btn" onClick={() => openExternal(links.facebook)}>
            <span className="share-ico share-fb">f</span>
            <span>Facebook</span>
          </button>
          <button className="share-btn" onClick={() => openExternal(links.whatsapp)}>
            <span className="share-ico share-wa">✆</span>
            <span>WhatsApp</span>
          </button>
          <button className="share-btn" onClick={copyLink}>
            <span className="share-ico">{copied ? '✓' : '⎘'}</span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="share-btn" onClick={handleDownload} disabled={!blob}>
            <span className="share-ico">⬇</span>
            <span>Save PNG</span>
          </button>
        </div>
        <div className="share-hint">X/FB/WhatsApp won't auto-attach the image — save it first, then attach.</div>
        <button className="ghost-btn" onClick={onClose} style={{ marginTop: 6 }}>
          Close
        </button>
      </div>
    </div>
  );
}
