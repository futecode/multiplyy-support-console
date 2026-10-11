import type { TicketStatus } from '../api/types';
import { STATUS_LABEL } from '../utils/format';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="badge-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function UnreadBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <span className="unread" aria-label={label ?? `${count} unread`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
