import { Link, useNavigate } from 'react-router-dom';
import type { Ticket } from '../api/types';
import { formatDate, partnerLabel, personLabel } from '../utils/format';
import { StatusBadge } from './Badges';

export function TicketTable({ tickets, compact = false }: { tickets: Ticket[]; compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Title</th>
            <th>Partner</th>
            <th>Client</th>
            {!compact && <th>Client code</th>}
            <th>Status</th>
            <th>Raised</th>
            {!compact && <th>Attachments</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const partner = partnerLabel(t.partner);
            return (
              <tr key={t.id} className="clickable" onClick={() => navigate(`/tickets/${t.id}`)}>
                <td className="nowrap">
                  <Link to={`/tickets/${t.id}`} className="ticket-ref" onClick={(e) => e.stopPropagation()}>
                    {t.ticketNo}
                  </Link>
                </td>
                <td className="cell-title">
                  <div className="strong truncate" title={t.categoryLabel}>
                    {t.categoryLabel}
                  </div>
                  {!compact && (
                    <div className="muted ellipsis" title={t.description}>
                      {t.description}
                    </div>
                  )}
                </td>
                <td>
                  <div className="truncate" title={partner}>
                    {partner}
                  </div>
                </td>
                <td>
                  <div className="truncate" title={t.client ? personLabel(t.client) : 'Partner (self)'}>
                    {t.client ? personLabel(t.client) : <span className="muted">Partner (self)</span>}
                  </div>
                </td>
                {!compact && <td className="nowrap mono">{t.clientCode ?? '—'}</td>}
                <td className="nowrap">
                  <StatusBadge status={t.status} />
                </td>
                <td className="nowrap muted">{formatDate(t.createdAt)}</td>
                {!compact && <td className="nowrap muted">{t.attachmentCount > 0 ? `📎 ${t.attachmentCount}` : ''}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
