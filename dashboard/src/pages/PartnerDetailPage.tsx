import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { SupportConversation } from '../api/types';
import { RelatedConversations, RelatedTickets } from '../components/Related';
import { AsyncBlock, Empty } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { Icon } from '../components/Icon';
import { formatDate, initials, personLabel } from '../utils/format';

export function PartnerDetailPage() {
  const { id = '' } = useParams();
  const partner = useAsync(useCallback(() => api.partner(id), [id]));
  const match = useCallback((c: SupportConversation) => c.partnerId === id, [id]);

  return (
    <div className="stack">
      <Link to="/partners" className="back">
        <Icon name="back" size={16} /> All partners
      </Link>
      <AsyncBlock state={partner} what="partner">
        {(p) => (
          <div className="grid-2">
            <section className="panel">
              <div className="panel-head">
                <div className="panel-title">
                  <span className="avatar avatar-lg" aria-hidden="true">
                    {initials(p.name || p.phone)}
                  </span>
                  <h2>{p.name || p.phone}</h2>
                </div>
                <span className="chip">{p.status}</span>
              </div>
              <dl className="panel-body dl">
                <dt>Business</dt>
                <dd>{p.businessName ?? '—'}</dd>
                <dt>Phone</dt>
                <dd>{p.phone}</dd>
                <dt>ARN</dt>
                <dd className="mono">{p.arn}</dd>
                <dt>EUIN</dt>
                <dd>{p.euin ?? '—'}</dd>
                <dt>Location</dt>
                <dd>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</dd>
                <dt>Active clients</dt>
                <dd>{p.activeClientCount}</dd>
                <dt>Joined</dt>
                <dd>{formatDate(p.createdAt)}</dd>
              </dl>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Clients ({p.clients.length})</h2>
              </div>
              {p.clients.length ? (
                <div className="table-wrap scroll-y">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Client code</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.clients.map((c) => (
                        <tr key={c.userId}>
                          <td>
                            <Link to={`/clients/${c.userId}`}>{personLabel(c)}</Link>
                          </td>
                          <td className="mono">{c.clientCode ?? '—'}</td>
                          <td className="nowrap">{c.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty icon="users">No active clients</Empty>
              )}
            </section>
          </div>
        )}
      </AsyncBlock>
      <div className="grid-2">
        <RelatedTickets partnerId={id} />
        <RelatedConversations match={match} />
      </div>
    </div>
  );
}
