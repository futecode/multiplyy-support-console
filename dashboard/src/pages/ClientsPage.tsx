import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { UnreadBadge } from '../components/Badges';
import { AsyncBlock, Empty } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { useMessageClient } from '../hooks/useMessageClient';
import { useRealtime } from '../realtime/RealtimeContext';
import { chatPartnerLabel, personLabel } from '../utils/format';

export function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const clients = useAsync(useCallback(() => api.chatClients(q), [q]));
  const { conversations } = useRealtime();
  const unread = new Map((conversations.data ?? []).map((c) => [c.id, c.unreadFromClient]));
  const messageClient = useMessageClient();
  const navigate = useNavigate();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setParams(search.trim() ? { q: search.trim() } : {});
  };

  return (
    <section className="panel">
      <div className="toolbar">
        <form onSubmit={onSearch} className="search">
          <input
            type="search"
            aria-label="Search clients"
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </div>
      {messageClient.error && (
        <p className="form-error" role="alert">
          {messageClient.error}
        </p>
      )}
      <AsyncBlock state={clients} what="clients">
        {(items) =>
          items.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Client code</th>
                    <th>Phone</th>
                    <th>Partner</th>
                    <th>Chat</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.userId} className="clickable" onClick={() => navigate(`/clients/${c.userId}`)}>
                      <td>
                        <Link to={`/clients/${c.userId}`} onClick={(e) => e.stopPropagation()}>
                          {personLabel(c)}
                        </Link>
                      </td>
                      <td className="mono">{c.clientCode ?? '—'}</td>
                      <td className="nowrap">{c.phone ?? '—'}</td>
                      <td>
                        {c.partner ? (
                          <Link to={`/partners/${c.partner.partnerId}`} onClick={(e) => e.stopPropagation()}>
                            {chatPartnerLabel(c.partner)}
                          </Link>
                        ) : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td className="nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={messageClient.busy === c.userId}
                          onClick={() => void messageClient.open(c.userId, c.conversationId)}
                        >
                          {c.conversationId ? 'Open chat' : messageClient.busy === c.userId ? 'Opening…' : 'Start chat'}
                        </button>{' '}
                        {c.conversationId && <UnreadBadge count={unread.get(c.conversationId) ?? 0} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="users" hint="Search by client name or phone number.">
              No clients found
            </Empty>
          )
        }
      </AsyncBlock>
    </section>
  );
}
