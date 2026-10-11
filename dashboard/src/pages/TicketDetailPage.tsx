import { useCallback, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { TicketDetail } from '../api/types';
import { Attachments } from '../components/Attachments';
import { StatusBadge } from '../components/Badges';
import { Icon } from '../components/Icon';
import { AsyncBlock } from '../components/States';
import { TicketActions } from '../components/TicketActions';
import { useAsync } from '../hooks/useAsync';
import { useTicketUpdates } from '../realtime/RealtimeContext';
import { eventTitle, formatDateTime, partnerLabel, personLabel } from '../utils/format';

/** Presigned attachment links live 5 minutes; refresh a little before that. */
const LINK_REFRESH_MS = 4 * 60 * 1000;

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const detail = useAsync(useCallback(() => api.ticket(id), [id]));
  const { refresh, setData } = detail;
  const hasAttachments = (detail.data?.attachments.length ?? 0) > 0;

  useTicketUpdates(() => void refresh(), id);

  useEffect(() => {
    if (!hasAttachments) return;
    const t = setInterval(() => void refresh(), LINK_REFRESH_MS);
    return () => clearInterval(t);
  }, [hasAttachments, refresh]);

  // A broken image usually means the presigned link expired; refetch, but never in a loop.
  const lastExpiry = useRef(0);
  const onExpired = useCallback(() => {
    if (Date.now() - lastExpiry.current < 30_000) return;
    lastExpiry.current = Date.now();
    void refresh();
  }, [refresh]);
  const onConflict = useCallback(() => void refresh(), [refresh]);

  return (
    <div className="stack">
      <Link to="/tickets" className="back">
        <Icon name="back" size={16} /> All tickets
      </Link>
      <AsyncBlock state={detail} what="ticket">
        {(t) => (
          <div className="detail-grid">
            <div className="stack">
              <TicketSummary ticket={t} />
              {t.attachments.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Attachments ({t.attachments.length})</h2>
                  </div>
                  <div className="panel-body">
                    <Attachments items={t.attachments} onExpired={onExpired} />
                  </div>
                </section>
              )}
              <Timeline ticket={t} />
            </div>
            <div className="stack">
              <People ticket={t} />
              <TicketActions ticket={t} onUpdated={setData} onConflict={onConflict} />
            </div>
          </div>
        )}
      </AsyncBlock>
    </div>
  );
}

function TicketSummary({ ticket: t }: { ticket: TicketDetail }) {
  const reopened = t.status === 'OPEN' && t.events.some((e) => e.type === 'REOPENED');
  return (
    <section className="panel">
      <div className="panel-body stack-sm">
        <div className="row-gap">
          <span className="ticket-no">{t.ticketNo}</span>
          <StatusBadge status={t.status} />
          {reopened && <span className="badge badge-open">Reopened</span>}
        </div>
        <h2 className="ticket-title">{t.categoryLabel}</h2>
        {t.status === 'RESOLVED' && (
          <p className="notice">
            {t.resolvedByRole === 'PARTNER' ? 'Closed by partner' : 'Resolved by support'}
            {t.resolvedAt && ` on ${formatDateTime(t.resolvedAt)}`}
            {t.reopenableUntil && `. Partner can reopen until ${formatDateTime(t.reopenableUntil)}`}
          </p>
        )}
        <div className="description">{t.description}</div>
      </div>
    </section>
  );
}

function People({ ticket: t }: { ticket: TicketDetail }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Details</h2>
      </div>
      <dl className="panel-body dl">
        <dt>Partner</dt>
        <dd>
          <Link to={`/partners/${t.partner.id}`}>{partnerLabel(t.partner)}</Link>
          <div className="muted small">
            {t.partner.phone}
            {t.partner.arn && ` · ARN ${t.partner.arn}`}
          </div>
        </dd>
        <dt>Client</dt>
        <dd>
          {t.client ? (
            <>
              <Link to={`/clients/${t.client.id}`}>{personLabel(t.client)}</Link>
              <div className="muted small">{t.client.phone}</div>
            </>
          ) : (
            'Partner (self)'
          )}
        </dd>
        <dt>Client code</dt>
        <dd className="mono">{t.clientCode ?? '—'}</dd>
        <dt>Category</dt>
        <dd>{t.categoryLabel}</dd>
        <dt>Raised</dt>
        <dd>{formatDateTime(t.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(t.updatedAt)}</dd>
      </dl>
    </section>
  );
}

function Timeline({ ticket: t }: { ticket: TicketDetail }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Timeline</h2>
      </div>
      <ol className="timeline panel-body">
        {t.events.map((e) => (
          <li key={e.id} className={`event event-${e.actorRole.toLowerCase()} event-type-${e.type.toLowerCase()}`}>
            <span className="event-node" aria-hidden="true" />
            <div className="event-head">
              <span className="strong">{eventTitle(e)}</span>
              <span className={`actor actor-${e.actorRole.toLowerCase()}`}>{e.actorRole === 'SUPPORT' ? 'Support' : 'Partner'}</span>
              <time className="muted small" dateTime={e.createdAt}>
                {formatDateTime(e.createdAt)}
              </time>
            </div>
            {e.note && <div className="event-note">{e.note}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
