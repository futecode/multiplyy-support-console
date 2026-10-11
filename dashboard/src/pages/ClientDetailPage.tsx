import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { RelatedConversations, RelatedTickets } from '../components/Related';
import { AsyncBlock } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { useMessageClient } from '../hooks/useMessageClient';
import { useRealtime } from '../realtime/RealtimeContext';
import { Icon } from '../components/Icon';
import { initials, personLabel } from '../utils/format';

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const client = useAsync(useCallback(() => api.client(id), [id]));
  const { conversations } = useRealtime();
  const messageClient = useMessageClient();
  const existing = conversations.data?.find((c) => c.clientId === id);
  const match = useCallback((c: { clientId: string }) => c.clientId === id, [id]);

  return (
    <div className="stack">
      <Link to="/clients" className="back">
        <Icon name="back" size={16} /> All clients
      </Link>
      <AsyncBlock state={client} what="client">
        {(c) => (
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="avatar avatar-lg" aria-hidden="true">
                  {initials(personLabel(c))}
                </span>
                <h2>{personLabel(c)}</h2>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={messageClient.busy !== null}
                onClick={() => void messageClient.open(c.userId, existing?.id)}
              >
                {messageClient.busy ? 'Opening…' : 'Message client'}
              </button>
            </div>
            <dl className="panel-body dl">
              <dt>Name</dt>
              <dd>{c.name ?? '—'}</dd>
              <dt>Phone</dt>
              <dd>{c.phone}</dd>
              <dt>Client code</dt>
              <dd className="mono">{c.clientCode ?? '—'}</dd>
              <dt>Partner</dt>
              <dd>
                {c.partner ? (
                  <>
                    <Link to={`/partners/${c.partner.id}`}>{personLabel(c.partner)}</Link>
                    <span className="muted small"> · {c.partner.phone}</span>
                  </>
                ) : (
                  <span className="muted">No active partner — handled by support</span>
                )}
              </dd>
            </dl>
            {messageClient.error && (
              <p className="form-error panel-body" role="alert">
                {messageClient.error}
              </p>
            )}
          </section>
        )}
      </AsyncBlock>
      <div className="grid-2">
        <RelatedTickets clientId={id} />
        <RelatedConversations match={match} />
      </div>
    </div>
  );
}
