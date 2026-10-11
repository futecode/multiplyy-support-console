import type { ChatPartnerRef, SupportConversation, TicketEvent, TicketPartner, TicketStatus } from '../api/types';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const timeOnly = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : '');
export const formatDate = (iso: string | null | undefined) => (iso ? dateOnly.format(new Date(iso)) : '');
export const formatTime = (iso: string | null | undefined) => (iso ? timeOnly.format(new Date(iso)) : '');

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

export function eventTitle(e: Pick<TicketEvent, 'type' | 'title' | 'fromStatus' | 'toStatus'>): string {
  if (e.title) return e.title;
  switch (e.type) {
    case 'CREATED':
      return 'Ticket raised';
    case 'NOTE':
      return 'Update';
    case 'REOPENED':
      return 'Reopened by partner';
    case 'STATUS_CHANGED':
      return `Status: ${e.fromStatus ? STATUS_LABEL[e.fromStatus] : '—'} → ${e.toStatus ? STATUS_LABEL[e.toStatus] : '—'}`;
  }
}

export const partnerLabel = (p: Pick<TicketPartner, 'name' | 'businessName' | 'phone'> | null | undefined) =>
  p ? [p.name, p.businessName].filter(Boolean).join(' / ') || p.phone : '—';

export const chatPartnerLabel = (p: ChatPartnerRef | null) => (p ? p.name || p.phone || 'Partner' : 'No partner');

export const personLabel = (p: { name: string | null; phone: string | null } | null | undefined) =>
  p ? p.name || p.phone || 'Unknown' : 'Unknown';

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Client-side search over the (unpaginated) support conversation list. */
export function matchesConversation(c: SupportConversation, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return [c.client.name, c.client.phone, c.client.clientCode, c.partner?.name, c.partner?.phone, c.lastMessage?.body]
    .some((v) => v?.toLowerCase().includes(t));
}

/** Most unread first, then most recent activity. */
export function byUnreadThenRecent(a: SupportConversation, b: SupportConversation): number {
  if (b.unreadFromClient !== a.unreadFromClient) return b.unreadFromClient - a.unreadFromClient;
  const at = a.lastMessage?.createdAt ?? a.updatedAt;
  const bt = b.lastMessage?.createdAt ?? b.updatedAt;
  return bt.localeCompare(at);
}

/** Up to two initials for an avatar circle. */
export const initials = (label: string | null | undefined) =>
  (label ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

/** Short relative time ("5m ago"); falls back to the date after a week. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const m = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : formatDate(iso);
}
