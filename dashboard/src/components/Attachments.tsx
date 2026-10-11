import type { TicketAttachment } from '../api/types';
import { formatBytes } from '../utils/format';
import { Icon } from './Icon';

function kind(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Excel';
  return 'File';
}

/** Images render as thumbnails, everything else as a file tile. Links are short-lived presigned URLs. */
export function Attachments({ items, onExpired }: { items: TicketAttachment[]; onExpired: () => void }) {
  return (
    <ul className="attachments">
      {items.map((a) => {
        const isImage = a.mimeType.startsWith('image/');
        const body = isImage && a.url ? (
          <img src={a.url} alt={a.fileName} className="thumb" onError={onExpired} />
        ) : (
          <span className="file-tile" data-kind={kind(a.mimeType)}>
            <span className="file-top">
              <Icon name="file" size={20} />
              <span className="file-kind">{isImage ? 'Image' : kind(a.mimeType)}</span>
            </span>
            <span className="file-name">{a.fileName}</span>
            <span className="muted small">{a.url ? formatBytes(a.byteSize) : 'Link unavailable'}</span>
          </span>
        );
        return (
          <li key={a.id} className="attachment" title={a.fileName}>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${a.fileName}`}>
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
